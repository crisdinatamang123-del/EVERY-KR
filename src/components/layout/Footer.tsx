/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';
import {
  PhoneCall,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  MapPin,
  Heart,
  Globe,
  Sparkles,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { setActiveSection } = useApp();

  return (
    <footer className="bg-[#070b16] text-slate-400 text-sm mt-24 border-t border-slate-800 pb-16 lg:pb-0 relative overflow-hidden">
      {/* Royal Dancheong Heritage Ribbon */}
      <div className="h-[2px] bg-gradient-to-r from-blue-700 via-indigo-600 via-rose-600 to-amber-500 w-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <EveryKrAnimatedLogo
                variant="static"
                isNight={true}
                imgClassName="h-9 sm:h-10"
              />
            </div>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              <strong className="text-white">EveryKR</strong> is the unified, multilingual international student ecosystem for South Korea. Connecting students across all 17 Korean provinces to verified university programs, live admission deadlines, verified housing, legal S-3 employment, and campus supplies.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Live Fall 2027 / Spring 2028 Sync</span>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/60">
                <Globe className="w-3 h-3 text-blue-400" />
                <span>16 Languages (inc. RTL)</span>
              </span>
            </div>
          </div>

          {/* Admissions Hub */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>Admissions Hub</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => setActiveSection('universities')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  340+ University Directory
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('finder')}
                  className="hover:text-blue-400 font-semibold text-blue-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>AI Eligibility Match Finder</span>
                  <Sparkles className="w-3 h-3" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('deadlines')}
                  className="hover:text-emerald-400 font-semibold text-emerald-300 transition-colors cursor-pointer"
                >
                  Live Deadlines & DHL Radar
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('universities')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Global Korea Scholarship (GKS)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('universities')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  English-Taught Degree Tracks
                </button>
              </li>
            </ul>
          </div>

          {/* Living & Student Care */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
              Student Life & Services
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => setActiveSection('arrival-prep')}
                  className="hover:text-amber-300 font-medium text-amber-200 transition-colors cursor-pointer"
                >
                  Arrival Wardrobe & 220V Guide
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('shop')}
                  className="hover:text-indigo-300 font-medium text-indigo-200 transition-colors cursor-pointer"
                >
                  EveryKR Campus Store
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('housing')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Verified Goshiwon & Studios
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('jobs')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  S-3 Legal Part-Time Jobs (₩10,030/hr)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('transit-health')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Climate Card & KTX Youth Passes
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('assistant')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Korean AI Cultural Phrasebook
                </button>
              </li>
            </ul>
          </div>

          {/* Official Helplines */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
              Official Helplines
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-white font-mono font-bold">1345</span>
                <span>Immigration (20+ Langs)</span>
              </li>
              <li className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-white font-mono font-bold">1330</span>
                <span>Tourism & Interpretation</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-white font-mono font-bold">119</span>
                <span>Fire & Emergency Medical</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-white font-mono font-bold">112</span>
                <span>Korean National Police</span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-white font-mono font-bold">120</span>
                <span>Dasan Call Center (Seoul)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 EveryKR (everykr.com) — Everything Korea, One Platform. Built for international scholars & foreign residents in South Korea.</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Seoul · Busan · Daegu · Incheon · Gwangju · Daejeon · Ulsan · Jeju</span>
            <span>·</span>
            <span>South Korea</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
