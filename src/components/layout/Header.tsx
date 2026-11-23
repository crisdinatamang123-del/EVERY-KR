/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp, ActiveSection } from '../../context/AppContext';
import { SupportedLanguage } from '../../i18n';
import { EveryKrAnimatedLogo } from '../common/EveryKrAnimatedLogo';
import {
  Search,
  User,
  ShieldCheck,
  Globe,
  Bell,
  Menu,
  X,
  Sparkles,
  Briefcase,
  HeartPulse,
  Compass,
  Check,
  LogOut,
  GraduationCap,
  Building2,
  Users,
  Calendar,
  Calculator,
  Luggage,
  ShoppingBag,
  ShoppingCart,
  ChevronDown,
  Moon,
  Sun,
  BookOpen,
} from 'lucide-react';

const LANGUAGE_LIST: { code: SupportedLanguage; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳' },
];

export const Header: React.FC = () => {
  const {
    activeSection,
    setActiveSection,
    currentUser,
    setCurrentUser,
    setShowAuthModal,
    searchQuery,
    setSearchQuery,
    language,
    setLanguage,
    t,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    cart,
    theme,
    toggleTheme,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [admissionsMenuOpen, setAdmissionsMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const admissionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (Cmd/Ctrl + K) for quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (admissionsRef.current && !admissionsRef.current.contains(event.target as Node)) {
        setAdmissionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangObj = LANGUAGE_LIST.find((l) => l.code === language) || LANGUAGE_LIST[0];

  const filteredLanguages = LANGUAGE_LIST.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const isAdmissionsActive =
    activeSection === 'universities' || activeSection === 'finder' || activeSection === 'deadlines';

  return (
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-[#070b16]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_25px_-4px_rgba(0,0,0,0.5)] transition-colors duration-250">
      {/* Royal Dancheong Heritage Ribbon */}
      <div className="h-[2px] bg-gradient-to-r from-blue-700 via-indigo-600 via-rose-600 to-amber-500 w-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Left Zone: Brand Logo */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveSection('home')}
              className="flex items-center text-left shrink-0 cursor-pointer group py-1 focus:outline-none"
              title="EveryKR — Everything Korea, One Platform"
              aria-label="EveryKR — Everything Korea, One Platform"
            >
              <EveryKrAnimatedLogo
                variant="compact"
                imgClassName="h-8 sm:h-9"
                className="transition-transform group-hover:scale-[1.02]"
              />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* Admissions Dropdown Hub */}
              <div className="relative" ref={admissionsRef}>
                <button
                  onClick={() => setAdmissionsMenuOpen(!admissionsMenuOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isAdmissionsActive
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 font-bold border border-blue-100/80 dark:border-blue-900/50'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                  }`}
                >
                  <GraduationCap className={`w-3.5 h-3.5 ${isAdmissionsActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'}`} />
                  <span>Admissions</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${admissionsMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {admissionsMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/10 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                    <button
                      onClick={() => {
                        setActiveSection('universities');
                        setAdmissionsMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                        activeSection === 'universities'
                          ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">University Directory</div>
                        <div className="text-[10px] text-slate-400">340+ Korean institutions & degrees</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveSection('finder');
                        setAdmissionsMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                        activeSection === 'finder'
                          ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">Requirement Match Finder</div>
                        <div className="text-[10px] text-slate-400">Match CGPA, TOPIK & scholarships</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveSection('deadlines');
                        setAdmissionsMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                        activeSection === 'deadlines'
                          ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">Live Deadlines Radar</div>
                        <div className="text-[10px] text-slate-400">DHL cutoffs & COA issuance dates</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Housing */}
              <button
                onClick={() => setActiveSection('housing')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'housing'
                    ? 'text-teal-600 dark:text-teal-400 bg-teal-50/90 dark:bg-teal-950/60 font-bold border border-teal-100/80 dark:border-teal-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${activeSection === 'housing' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>Housing</span>
              </button>

              {/* Arrival Prep */}
              <button
                onClick={() => setActiveSection('arrival-prep')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'arrival-prep'
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/60 font-bold border border-amber-100/80 dark:border-amber-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <Luggage className={`w-3.5 h-3.5 ${activeSection === 'arrival-prep' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>Arrival Prep</span>
              </button>

              {/* Learn Hangul */}
              <button
                onClick={() => setActiveSection('learn-hangul')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'learn-hangul'
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50/90 dark:bg-rose-950/60 font-bold border border-rose-100/80 dark:border-rose-900/50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <BookOpen className={`w-3.5 h-3.5 ${activeSection === 'learn-hangul' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>Learn Hangul</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-extrabold font-mono">5K+</span>
              </button>

              {/* Student Store */}
              <button
                onClick={() => setActiveSection('shop')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'shop'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/60 font-bold border border-indigo-100/80 dark:border-indigo-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <ShoppingBag className={`w-3.5 h-3.5 ${activeSection === 'shop' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>Store</span>
              </button>

              {/* Transit & KTX */}
              <button
                onClick={() => setActiveSection('transit')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'transit'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 font-bold border border-blue-100/80 dark:border-blue-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${activeSection === 'transit' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>Transit & KTX</span>
              </button>

              {/* S-3 Part-time Jobs */}
              <button
                onClick={() => setActiveSection('jobs')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'jobs'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 font-bold border border-blue-100/80 dark:border-blue-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <Briefcase className={`w-3.5 h-3.5 ${activeSection === 'jobs' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>Jobs</span>
              </button>

              {/* Student Community */}
              <button
                onClick={() => setActiveSection('community')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'community'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 font-bold border border-blue-100/80 dark:border-blue-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${activeSection === 'community' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>Community</span>
              </button>

              {/* Korean AI Assistant */}
              <button
                onClick={() => setActiveSection('assistant')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'assistant'
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 font-bold border border-purple-100/80 dark:border-purple-900/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/60 dark:hover:bg-purple-950/30'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>AI Helper</span>
              </button>
            </nav>
          </div>

          {/* Right Zone: Search, Theme Toggle, Language, Cart, Notifications, User */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Spotlight Search Bar */}
            <div className="relative hidden xl:block w-44 focus-within:w-60 transition-all duration-200">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setActiveSection('universities');
                  }
                }}
                placeholder="Search Korea... (⌘K)"
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-[#0c1222] rounded-xl border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Prestige Luxury Theme Toggle (Sun / Moon) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-2xs"
              title={theme === 'dark' ? 'Switch to Prestige Light Mode' : 'Switch to Prestige Dark Mode'}
              aria-label="Toggle Prestige Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* 16-Language Dropdown */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10"
                title="Select Language (16 Available)"
                aria-label="Change Language"
              >
                <span className="text-sm leading-none">{currentLangObj.flag}</span>
                <span className="font-mono text-[11px] font-bold uppercase">{currentLangObj.code}</span>
                <Globe className="w-3 h-3 text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-1 mb-1">
                    <input
                      type="text"
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      placeholder="Search 16 languages..."
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLanguages.map((lang) => {
                      const isSelected = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setLangDropdownOpen(false);
                            setLangSearch('');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/70 font-bold text-blue-600 dark:text-blue-400'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-sm">{lang.flag}</span>
                            <span className="truncate">{lang.nativeName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({lang.name})</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#070b16]">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Student Notifications</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{unreadNotificationCount} unread</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No notifications yet</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`pt-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                            !n.read ? 'bg-blue-50/70 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                            <span className="truncate">{n.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                              {(n.timestamp || n.createdAt).split('T')[0]}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Student Store Cart Button */}
            <button
              type="button"
              onClick={() => setActiveSection('shop')}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10"
              title="Student Store & Cart"
              aria-label="Open Cart"
            >
              <ShoppingCart className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#070b16]">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>

            {/* User Profile / Login */}
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setActiveSection(currentUser.role === 'admin' ? 'admin-dashboard' : 'student-dashboard')
                  }
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  {currentUser.role === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400 dark:text-amber-300" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-white dark:text-blue-700 text-white flex items-center justify-center text-[10px] font-bold">
                      {currentUser.name[0]}
                    </div>
                  )}
                  <span className="truncate max-w-[90px]">
                    {currentUser.role === 'admin' ? 'Admin' : currentUser.name.split(' ')[0]}
                  </span>
                </button>
                <button
                  onClick={() => setCurrentUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                {t.nav.signIn}
              </button>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-4 shadow-2xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search universities, housing, KTX..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveSection('universities');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Universities</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('finder');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl text-left flex items-center gap-2"
            >
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>AI Match Finder</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('deadlines');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-left flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Deadlines Radar</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('housing');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Housing</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('arrival-prep');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-amber-50/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl text-left flex items-center gap-2"
            >
              <Luggage className="w-4 h-4 text-amber-600" />
              <span>Arrival Prep</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('learn-hangul');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-rose-50/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-xl text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-600" />
                <span className="font-semibold">Learn Hangul</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-extrabold font-mono">5,200 Words</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('shop');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-left flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>Student Store</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('transit');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-blue-600" />
              <span>Transit & KTX</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('jobs');
                setMobileMenuOpen(false);
              }}
              className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Jobs</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
