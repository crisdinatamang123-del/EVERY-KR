import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';
import { EveryKrAnimatedLogo } from './common/EveryKrAnimatedLogo';
import { LanguageCode } from '../types';
import { sanitizeAccountDisplayName } from '../services/chatSessionService';
import {
  Globe,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Check,
  FileText,
  Sun,
  Moon,
  Menu,
  X,
  GraduationCap,
  BookOpen,
  Building2,
  Plane,
  Users,
  Award,
  Briefcase,
  Smartphone,
  Shield,
} from 'lucide-react';

interface HeaderUtilityLabels {
  login: string;
  dashboard: string;
  myApplications: string;
  profile: string;
  settings: string;
  admin: string;
  logout: string;
  navUniversities: string;
  navLearnKorean: string;
  navHousing: string;
  navTransport: string;
  navCommunity: string;
}

const HEADER_UTILITY_LABELS: Record<LanguageCode, HeaderUtilityLabels> = {
  en: {
    login: 'Login',
    dashboard: 'Dashboard',
    myApplications: 'My Applications',
    profile: 'My Profile',
    settings: 'Settings',
    admin: 'Admin Portal',
    logout: 'Sign Out',
    navUniversities: 'Universities',
    navLearnKorean: 'Learn Korean',
    navHousing: 'Housing',
    navTransport: 'Transport',
    navCommunity: 'Community',
  },
  bn: {
    login: 'লগইন',
    dashboard: 'ড্যাশবোর্ড',
    myApplications: 'আমার আবেদনসমূহ',
    profile: 'আমার প্রোফাইল',
    settings: 'সেটিংস',
    admin: 'অ্যাডমিন পোর্টাল',
    logout: 'লগ আউট',
    navUniversities: 'বিশ্ববিদ্যালয়',
    navLearnKorean: 'কোরিয়ান শিখুন',
    navHousing: 'আবাসন',
    navTransport: 'যাতায়াত',
    navCommunity: 'কমিউনিটি',
  },
  ko: {
    login: '로그인',
    dashboard: '대시보드',
    myApplications: '내 지원서',
    profile: '내 프로필',
    settings: '설정',
    admin: '관리자 포털',
    logout: '로그아웃',
    navUniversities: '대학교',
    navLearnKorean: '한국어',
    navHousing: '숙소',
    navTransport: '교통',
    navCommunity: '커뮤니티',
  },
  ne: {
    login: 'लगइन',
    dashboard: 'ड्यासबोर्ड',
    myApplications: 'मेरा आवेदनहरू',
    profile: 'मेरो प्रोफाइल',
    settings: 'सेटिङहरू',
    admin: 'एडमिन पोर्टल',
    logout: 'लगआउट',
    navUniversities: 'विश्वविद्यालय',
    navLearnKorean: 'कोरियन सिक्नुहोस्',
    navHousing: 'आवास',
    navTransport: 'यातायात',
    navCommunity: 'समुदाय',
  },
  ur: {
    login: 'لاگ ان',
    dashboard: 'ڈیش بورڈ',
    myApplications: 'میری درخواستیں',
    profile: 'میری پروفائل',
    settings: 'ترتیبات',
    admin: 'ایڈمن پورٹل',
    logout: 'سائن آؤٹ',
    navUniversities: 'یونیورسٹیاں',
    navLearnKorean: 'کورین سیکھیں',
    navHousing: 'رہائش',
    navTransport: 'ٹرانسپورٹ',
    navCommunity: 'کمیونٹی',
  },
  hi: {
    login: 'लॉगिन',
    dashboard: 'डैशबोर्ड',
    myApplications: 'मेरे आवेदन',
    profile: 'मेरी प्रोफ़ाइल',
    settings: 'सेटिंग्स',
    admin: 'एडमिन पोर्टल',
    logout: 'लॉग आउट',
    navUniversities: 'विश्वविद्यालय',
    navLearnKorean: 'कोरियाई सीखें',
    navHousing: 'आवास',
    navTransport: 'परिवहन',
    navCommunity: 'समुदाय',
  },
  zh: {
    login: '登录',
    dashboard: '控制面板',
    myApplications: '我的申请',
    profile: '个人资料',
    settings: '设置',
    admin: '管理后台',
    logout: '退出登录',
    navUniversities: '韩国大学',
    navLearnKorean: '学习韩语',
    navHousing: '学生住宿',
    navTransport: '交通出行',
    navCommunity: '社区',
  },
  ar: {
    login: 'تسجيل الدخول',
    dashboard: 'لوحة التحكم',
    myApplications: 'طلباتي',
    profile: 'ملفي الشخصي',
    settings: 'الإعدادات',
    admin: 'بوابة المشرف',
    logout: 'تسجيل الخروج',
    navUniversities: 'الجامعات',
    navLearnKorean: 'تعلم الكورية',
    navHousing: 'السكن',
    navTransport: 'المواصلات',
    navCommunity: 'المجتمع',
  },
  ja: {
    login: 'ログイン',
    dashboard: 'ダッシュボード',
    myApplications: 'マイ出願',
    profile: 'マイプロフィール',
    settings: '設定',
    admin: '管理者ポータル',
    logout: 'ログアウト',
    navUniversities: '大学',
    navLearnKorean: '韓国語学習',
    navHousing: '宿舎',
    navTransport: '交通',
    navCommunity: 'コミュニティ',
  },
};

export const GlobalHeader: React.FC = () => {
  const location = useLocation();
  const {
    language,
    setLanguage,
    t,
    currentUser,
    isAuthReady,
    isLoggingOut,
    unreadCount,
    logout,
    theme,
    toggleTheme,
  } = useApp();

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangDropdownOpen(false);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setLangDropdownOpen(false);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  const currentLangMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const labels = HEADER_UTILITY_LABELS[language] || HEADER_UTILITY_LABELS.en;
  const isRtl = language === 'ur' || language === 'ar';
  const isNight = theme === 'dark';

  const isAdmin =
    currentUser?.role === 'admin' || (currentUser?.role as string) === 'super_admin';

  const cleanAccountName = currentUser
    ? sanitizeAccountDisplayName(
        currentUser.fullName || currentUser.name,
        currentUser.id || currentUser.uid,
        currentUser.email
      )
    : null;

  const firstName = cleanAccountName?.split(' ')[0] || 'Account';

  const userInitial = (
    cleanAccountName?.charAt(0) ||
    currentUser?.email?.charAt(0) ||
    'U'
  ).toUpperCase();

  const primaryNavItems = [
    {
      to: '/universities',
      label: labels.navUniversities,
      icon: GraduationCap,
      active: location.pathname.startsWith('/universit') || location.pathname.startsWith('/apply'),
    },
    {
      to: '/learn-hangul',
      label: labels.navLearnKorean,
      icon: BookOpen,
      active:
        location.pathname.startsWith('/learn-hangul') ||
        location.pathname.startsWith('/korean-academy') ||
        location.pathname.startsWith('/language'),
    },
    {
      to: '/housing',
      label: labels.navHousing,
      icon: Building2,
      active:
        location.pathname.startsWith('/housing') ||
        location.pathname.startsWith('/accommodation'),
    },
    {
      to: '/transportation',
      label: labels.navTransport,
      icon: Plane,
      active: location.pathname.startsWith('/transportation'),
    },
    {
      to: '/community',
      label: labels.navCommunity,
      icon: Users,
      active: location.pathname.startsWith('/community'),
    },
  ];

  const secondaryMobileItems = [
    { to: '/scholarships', label: 'Scholarships', icon: Award },
    { to: '/visa', label: 'Student Visa', icon: Shield },
    { to: '/jobs', label: 'Part-Time Jobs', icon: Briefcase },
    { to: '/sim', label: 'Free SIM', icon: Smartphone },
  ];

  return (
    <header
      ref={headerRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`ekr-glass-nav sticky top-0 z-40 w-full transition-colors duration-200 ${
        isNight ? 'text-white' : 'text-[#061B49]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4 h-16">
          {/* LEFT: Official Animated EveryKR Logo */}
          <Link
            to="/"
            className="group inline-flex items-center rounded-xl py-1 shrink-0 min-w-0 max-w-[48vw] sm:max-w-none transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
            aria-label="EveryKR — Everything Korea, One Platform"
          >
            <EveryKrAnimatedLogo
              variant={location.pathname === '/' ? 'homepage' : 'static'}
              isNight={isNight}
              imgClassName="h-8 sm:h-9 md:h-10"
            />
          </Link>

          {/* CENTER: Single-Line Institutional Navigation (Desktop lg+) */}
          <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-1">
            {primaryNavItems.map((navItem) => (
              <Link
                key={navItem.to}
                to={navItem.to}
                data-active={navItem.active ? 'true' : 'false'}
                className={`ekr-header-nav-link px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                  navItem.active
                    ? isNight
                      ? 'text-white bg-white/8'
                      : 'text-[#0754B8] bg-[#0754B8]/8'
                    : isNight
                    ? 'text-[#B8C9E5] hover:text-white hover:bg-white/6'
                    : 'text-[#475569] hover:text-[#061B49] hover:bg-[#061B49]/5'
                }`}
              >
                {navItem.label}
              </Link>
            ))}
          </nav>

          {/* RIGHT: Theme Toggle | Language Selector | User Account | Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Day / Night Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isNight ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isNight ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`ekr-glass-subtle inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                isNight
                  ? 'text-[#FFB800] hover:text-white'
                  : 'text-[#475569] hover:text-[#0754B8]'
              }`}
            >
              {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Global Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangDropdownOpen((v) => !v);
                  setUserMenuOpen(false);
                  setMobileMenuOpen(false);
                }}
                className={`ekr-glass-subtle inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                  isNight
                    ? 'text-[#DCE5F0] hover:text-white'
                    : 'text-[#061B49] hover:text-[#0754B8]'
                }`}
                aria-label={t('select_language') || 'Select Language'}
                aria-expanded={langDropdownOpen}
                aria-haspopup="listbox"
              >
                <Globe className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                <span data-no-translate="true" className="uppercase font-bold tracking-wide">
                  {currentLangMeta.code.toUpperCase()}
                </span>
                <ChevronDown
                  className={`w-3 h-3 opacity-70 transition-transform duration-150 shrink-0 ${
                    langDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {langDropdownOpen && (
                <div
                  role="listbox"
                  aria-label={t('select_language') || 'Select Language'}
                  className={`ekr-glass-dropdown absolute end-0 mt-2 w-48 rounded-xl py-1.5 z-50 max-h-80 overflow-y-auto ${
                    isNight ? 'text-slate-100' : 'text-[#061B49]'
                  }`}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setLanguage(lang.code);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-start text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? isNight
                              ? 'bg-[#0875E8]/25 text-white font-bold'
                              : 'bg-[#0754B8]/10 text-[#0754B8] font-bold'
                            : isNight
                            ? 'hover:bg-white/8 text-[#B8C9E5]'
                            : 'hover:bg-[#F5F8FD] text-[#061B49]'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span aria-hidden="true">{lang.flag}</span>
                          <span
                            data-no-translate="true"
                            className="uppercase font-bold tracking-wide shrink-0"
                          >
                            {lang.code.toUpperCase()}
                          </span>
                          <span
                            data-no-translate="true"
                            className="text-[11px] opacity-80 truncate"
                          >
                            {lang.nativeLabel}
                          </span>
                        </span>
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Authenticated User Profile Button (or Login Button) */}
            {!isAuthReady ? (
              <div
                aria-hidden="true"
                className="ekr-glass-subtle h-9 sm:h-10 w-20 rounded-lg animate-pulse shrink-0"
              />
            ) : currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((v) => !v);
                    setLangDropdownOpen(false);
                    setMobileMenuOpen(false);
                  }}
                  className={`ekr-glass-subtle inline-flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                    isNight ? 'text-white' : 'text-[#061B49]'
                  }`}
                  aria-label="User Account Menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0754B8] text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 overflow-hidden">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={cleanAccountName || firstName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  <span
                    data-no-translate="true"
                    className="hidden sm:inline max-w-[110px] truncate"
                  >
                    {firstName}
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="text-[10px] font-mono font-bold text-[#0754B8] dark:text-[#60A5FA] tabular-nums"
                      aria-label={`${unreadCount} unread notifications`}
                    >
                      {unreadCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3 h-3 opacity-70 transition-transform duration-150 shrink-0 ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className={`ekr-glass-dropdown absolute end-0 mt-2 w-56 rounded-xl py-1.5 z-50 text-xs ${
                      isNight ? 'text-slate-100' : 'text-[#061B49]'
                    }`}
                  >
                    <div
                      className={`px-3.5 py-2.5 border-b ${
                        isNight ? 'border-white/10' : 'border-slate-200/80'
                      }`}
                    >
                      <p
                        data-no-translate="true"
                        className={`text-xs font-bold truncate ${
                          isNight ? 'text-white' : 'text-[#061B49]'
                        }`}
                      >
                        {cleanAccountName || firstName}
                      </p>
                      {currentUser.email && (
                        <p
                          data-no-translate="true"
                          className={`text-[11px] truncate mt-0.5 ${
                            isNight ? 'text-[#B8C9E5]' : 'text-slate-500'
                          }`}
                        >
                          {currentUser.email}
                        </p>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 transition-colors ${
                          isNight ? 'hover:bg-white/8' : 'hover:bg-[#F5F8FD]'
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                        <span data-no-translate="true">{labels.dashboard}</span>
                      </Link>
                      <Link
                        to="/my-applications"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 transition-colors ${
                          isNight ? 'hover:bg-white/8' : 'hover:bg-[#F5F8FD]'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                        <span data-no-translate="true">{labels.myApplications}</span>
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 transition-colors ${
                          isNight ? 'hover:bg-white/8' : 'hover:bg-[#F5F8FD]'
                        }`}
                      >
                        <UserIcon className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                        <span data-no-translate="true">{labels.profile}</span>
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2 transition-colors ${
                          isNight ? 'hover:bg-white/8' : 'hover:bg-[#F5F8FD]'
                        }`}
                      >
                        <Settings className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                        <span data-no-translate="true">{labels.settings}</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3.5 py-2 font-semibold transition-colors ${
                            isNight
                              ? 'text-emerald-400 hover:bg-white/8'
                              : 'text-emerald-700 hover:bg-emerald-50/70'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span data-no-translate="true">{labels.admin}</span>
                        </Link>
                      )}
                    </div>

                    <div
                      className={`my-1 border-t ${
                        isNight ? 'border-white/10' : 'border-slate-200/80'
                      }`}
                    />
                    <button
                      type="button"
                      disabled={Boolean(isLoggingOut)}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setUserMenuOpen(false);
                        void logout();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-semibold cursor-pointer transition-colors disabled:opacity-60 ${
                        isNight
                          ? 'text-rose-400 hover:bg-white/8'
                          : 'text-rose-600 hover:bg-rose-50/80'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span data-no-translate="true">{labels.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                data-no-translate="true"
                className="ekr-glass-btn-primary inline-flex items-center justify-center h-9 sm:h-10 px-3.5 sm:px-4 rounded-lg text-xs font-bold whitespace-nowrap shrink-0"
              >
                {labels.login}
              </Link>
            )}

            {/* Mobile Navigation Drawer Toggle (< lg) */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen((v) => !v);
                setLangDropdownOpen(false);
                setUserMenuOpen(false);
              }}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className={`lg:hidden ekr-glass-subtle inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
                isNight ? 'text-white' : 'text-[#061B49]'
              }`}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer (< lg) */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden border-t px-4 py-4 space-y-4 ${
            isNight
              ? 'bg-[#071940] border-white/10 text-white'
              : 'bg-white border-slate-200/80 text-[#061B49]'
          }`}
        >
          <nav aria-label="Mobile Primary Navigation" className="grid grid-cols-1 gap-1">
            {primaryNavItems.map((navItem) => {
              const Icon = navItem.icon;
              return (
                <Link
                  key={navItem.to}
                  to={navItem.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 min-h-[44px] px-3.5 rounded-xl text-sm font-semibold transition-colors ${
                    navItem.active
                      ? isNight
                        ? 'bg-[#0875E8]/20 text-white'
                        : 'bg-[#0754B8]/10 text-[#0754B8]'
                      : isNight
                      ? 'text-[#B8C9E5] hover:bg-white/8 hover:text-white'
                      : 'text-[#475569] hover:bg-[#F5F8FD] hover:text-[#061B49]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                  <span>{navItem.label}</span>
                </Link>
              );
            })}
          </nav>

          <div
            className={`pt-3 border-t grid grid-cols-2 gap-1.5 ${
              isNight ? 'border-white/10' : 'border-slate-200/80'
            }`}
          >
            {secondaryMobileItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 min-h-[42px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                    isNight
                      ? 'text-[#B8C9E5] hover:bg-white/8 hover:text-white'
                      : 'text-slate-600 hover:bg-[#F5F8FD] hover:text-[#061B49]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
