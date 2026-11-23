/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp, ActiveSection } from '../../context/AppContext';
import {
  Home,
  Building2,
  Briefcase,
  Compass,
  UserCheck,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export const MobileTabBar: React.FC = () => {
  const { activeSection, setActiveSection, currentUser } = useApp();

  const tabs: { id: ActiveSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'universities', label: 'Unis', icon: Compass },
    { id: 'jobs', label: 'S-3 Jobs', icon: Briefcase },
    { id: 'shop', label: 'Store', icon: ShoppingBag },
    { id: 'assistant', label: 'AI Helper', icon: Sparkles },
    {
      id: currentUser?.role === 'admin' ? 'admin-dashboard' : 'student-dashboard',
      label: 'My Page',
      icon: UserCheck,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070b16]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-2 py-1 shadow-2xl transition-colors duration-200">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.4px] scale-105' : 'stroke-[1.8px]'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
