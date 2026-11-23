import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { EveryKrAnimatedLogo } from './common/EveryKrAnimatedLogo';
import { Mail, MapPin } from 'lucide-react';
import { FooterDeveloperCreditTrigger } from './DeveloperProfileBar';
import type { LanguageCode } from '../types';

const FOOTER_TEXT: Record<
  LanguageCode,
  {
    tagline: string;
    desc: string;
    col2Title: string;
    universities: string;
    learnKorean: string;
    accommodation: string;
    scholarships: string;
    community: string;
    col3Title: string;
    discoverKorea: string;
    studentVisaGuide: string;
    partTimeJobs: string;
    studentSupport: string;
    everykrAi: string;
    col4Title: string;
    aboutEverykr: string;
    location: string;
    privacy: string;
    terms: string;
    copyright: string;
  }
> = {
  en: {
    tagline: 'EVERYTHING KOREA, ONE PLATFORM.',
    desc: 'Your gateway to Korean education, opportunities, and student life.',
    col2Title: 'Quick Links',
    universities: 'Universities',
    learnKorean: 'Learn Korean',
    accommodation: 'Accommodation',
    scholarships: 'Scholarships',
    community: 'Community',
    col3Title: 'Other Services',
    discoverKorea: 'Discover Korea',
    studentVisaGuide: 'Student Visa Guide',
    partTimeJobs: 'Part-Time Jobs',
    studentSupport: 'Student Support',
    everykrAi: 'EVERYKR AI',
    col4Title: 'Contact',
    aboutEverykr: 'About EVERYKR',
    location: 'Busan, South Korea',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    copyright: 'All rights reserved.'
  },
  bn: {
    tagline: 'কোরিয়ার সবকিছু, এক প্ল্যাটফর্মে।',
    desc: 'কোরিয়ান শিক্ষা, সুযোগ এবং ছাত্রজীবনের জন্য আপনার বিশ্বস্ত গেটওয়ে।',
    col2Title: 'প্রয়োজনীয় লিংক',
    universities: 'বিশ্ববিদ্যালয়',
    learnKorean: 'কোরিয়ান ভাষা শিখুন',
    accommodation: 'আবাসন',
    scholarships: 'বৃত্তি',
    community: 'স্টুডেন্ট কমিউনিটি',
    col3Title: 'অন্যান্য সেবা',
    discoverKorea: 'কোরিয়া জানুন',
    studentVisaGuide: 'স্টুডেন্ট ভিসা গাইড',
    partTimeJobs: 'পার্ট-টাইম জব',
    studentSupport: 'শিক্ষার্থী সহায়তা',
    everykrAi: 'EVERYKR AI',
    col4Title: 'যোগাযোগ',
    aboutEverykr: 'EVERYKR সম্পর্কে',
    location: 'বুসান, দক্ষিণ কোরিয়া',
    privacy: 'গোপনীয়তা নীতি',
    terms: 'ব্যবহারের শর্তাবলী',
    copyright: 'সর্বস্বত্ব সংরক্ষিত।'
  },
  ko: {
    tagline: '한국의 모든 것, 하나의 플랫폼.',
    desc: '한국 유학, 기회, 그리고 대학 생활을 연결하는 글로벌 통합 플랫폼.',
    col2Title: '바로가기',
    universities: '대학교',
    learnKorean: '한국어 배우기',
    accommodation: '기숙사·숙소',
    scholarships: '장학금',
    community: '커뮤니티',
    col3Title: '기타 서비스',
    discoverKorea: '한국 알아보기',
    studentVisaGuide: '학생 비자 가이드',
    partTimeJobs: '아르바이트 정보',
    studentSupport: '학생 지원',
    everykrAi: 'EVERYKR AI',
    col4Title: '문의 및 안내',
    aboutEverykr: 'EVERYKR 소개',
    location: '대한민국 부산광역시',
    privacy: '개인정보처리방침',
    terms: '이용약관',
    copyright: '모든 권리 보유.'
  },
  ne: {
    tagline: 'कोरियाको सम्पूर्ण जानकारी, एउटै प्लेटफर्म।',
    desc: 'कोरियन शिक्षा, अवसर र विद्यार्थी जीवनको लागि तपाईंको भरपर्दो प्लेटफर्म।',
    col2Title: 'द्रुत लिंकहरू',
    universities: 'विश्वविद्यालयहरू',
    learnKorean: 'कोरियन सिक्नुहोस्',
    accommodation: 'आवास र होस्टেল',
    scholarships: 'छात्रवृत्ति',
    community: 'समुदाय',
    col3Title: 'अन्य सेवाहरू',
    discoverKorea: 'कोरिया अन्वेषण',
    studentVisaGuide: 'विद्यार्थी भिसा गाइड',
    partTimeJobs: 'पार्ट-टाइम काम',
    studentSupport: 'विद्यार्थी सहायता',
    everykrAi: 'EVERYKR AI',
    col4Title: 'सम्पर्क',
    aboutEverykr: 'EVERYKR बारेमा',
    location: 'बुसान, दक्षिण कोरिया',
    privacy: 'गोपनीयता नीति',
    terms: 'सेवाका सर्तहरू',
    copyright: 'सर्वाधिकार सुरक्षित।'
  },
  ur: {
    tagline: 'کوریا کی ہر معلومات، ایک پلیٹ فارم۔',
    desc: 'کورین تعلیم، مواقع اور طالب علمی کی زندگی کے لیے آپ کا قابلِ اعتماد پلیٹ فارم۔',
    col2Title: 'فوری لنکس',
    universities: 'یونیورسٹیاں',
    learnKorean: 'کورین سیکھیں',
    accommodation: 'رہائش اور ہاسٹل',
    scholarships: 'اسکالرشپس',
    community: 'کمیونٹی',
    col3Title: 'دیگر خدمات',
    discoverKorea: 'کوریا دریافت کریں',
    studentVisaGuide: 'اسٹوڈنٹ ویزا گائیڈ',
    partTimeJobs: 'پارٹ ٹائم ملازمتیں',
    studentSupport: 'اسٹوڈنٹ سپورٹ',
    everykrAi: 'EVERYKR AI',
    col4Title: 'رابطہ',
    aboutEverykr: 'EVERYKR کے بارے میں',
    location: 'بوسان، جنوبی کوریا',
    privacy: 'پرائیویسی پالیسی',
    terms: 'شرائطِ استعمال',
    copyright: 'جملہ حقوق محفوظ ہیں۔'
  },
  hi: {
    tagline: 'कोरिया की हर जानकारी, एक प्लेटफॉर्म।',
    desc: 'कोरियाई शिक्षा, अवसर और छात्र जीवन के लिए आपका विश्वसनीय गेटवे।',
    col2Title: 'त्वरित लिंक',
    universities: 'विश्वविद्यालय',
    learnKorean: 'कोरियाई सीखें',
    accommodation: 'आवास',
    scholarships: 'छात्रवृत्ति',
    community: 'समुदाय',
    col3Title: 'अन्य सेवाएं',
    discoverKorea: 'कोरिया जानें',
    studentVisaGuide: 'छात्र वीज़ा गाइड',
    partTimeJobs: 'पार्ट-टाइम नौकरियां',
    studentSupport: 'छात्र सहायता',
    everykrAi: 'EVERYKR AI',
    col4Title: 'संपर्क',
    aboutEverykr: 'EVERYKR के बारे में',
    location: 'बुसान, दक्षिण कोरिया',
    privacy: 'गोपनीयता नीति',
    terms: 'सेवा की शर्तें',
    copyright: 'सर्वाधिकार सुरक्षित।'
  },
  ar: {
    tagline: 'كل ما يخص كوريا، في منصة واحدة.',
    desc: 'بوابتك الموثوقة للتعليم الكوري، الفرص الأكاديمية، وحياة الطلاب في كوريا الجنوبية.',
    col2Title: 'روابط سريعة',
    universities: 'الجامعات',
    learnKorean: 'تعلم الكورية',
    accommodation: 'السكن الطلابي',
    scholarships: 'المنح الدراسية',
    community: 'مجتمع الطلاب',
    col3Title: 'خدمات أخرى',
    discoverKorea: 'اكتشف كوريا',
    studentVisaGuide: 'دليل تأشيرة الطالب',
    partTimeJobs: 'وظائف بدوام جزئي',
    studentSupport: 'دعم الطلاب',
    everykrAi: 'EVERYKR AI',
    col4Title: 'تواصل معنا',
    aboutEverykr: 'عن EVERYKR',
    location: 'بوسان، كوريا الجنوبية',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الخدمة',
    copyright: 'جميع الحقوق محفوظة.'
  },
  zh: {
    tagline: '韩国留学与生活，一站式平台。',
    desc: '连接韩国高等教育、奖学金机会与留学生生活的综合平台。',
    col2Title: '快速链接',
    universities: '韩国大学',
    learnKorean: '学习韩语',
    accommodation: '学生住宿',
    scholarships: '奖学金',
    community: '留学生社区',
    col3Title: '其他服务',
    discoverKorea: '探索韩国',
    studentVisaGuide: '学生签证指南',
    partTimeJobs: '兼职工作',
    studentSupport: '学生支持',
    everykrAi: 'EVERYKR AI',
    col4Title: '联系我们',
    aboutEverykr: '关于 EVERYKR',
    location: '韩国釜山广域市',
    privacy: '隐私政策',
    terms: '服务条款',
    copyright: '保留所有权利。'
  },
  ja: {
    tagline: '韓国のすべてを、一つのプラットフォームで。',
    desc: '韓国の大学進学、奨学金、そして充実した留学生活をつなぐ総合プラットフォーム。',
    col2Title: 'クイックリンク',
    universities: '韓国の大学',
    learnKorean: '韓国語を学ぶ',
    accommodation: '学生宿舎・滞在先',
    scholarships: '奨学金',
    community: 'コミュニティ',
    col3Title: 'その他のサービス',
    discoverKorea: '韓国を知る',
    studentVisaGuide: '学生ビザガイド',
    partTimeJobs: 'アルバイト情報',
    studentSupport: '学生サポート',
    everykrAi: 'EVERYKR AI',
    col4Title: 'お問い合わせ',
    aboutEverykr: 'EVERYKRについて',
    location: '韓国 釜山広域市',
    privacy: 'プライバシーポリシー',
    terms: '利用規約',
    copyright: 'All rights reserved.'
  }
};

export const Footer: React.FC = () => {
  const { language, theme } = useApp();
  const currentYear = new Date().getFullYear();
  const copy = FOOTER_TEXT[language] || FOOTER_TEXT.en;
  const isRtl = language === 'ur' || language === 'ar';
  const isNight = theme === 'dark';

  return (
    <footer
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`ekr-glass-footer transition-colors duration-300 ${
        isNight ? 'text-[#FFFFFF]' : 'text-[#10213D]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 sm:py-11">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6 items-start pb-8 border-b ${
            isNight ? 'border-white/12' : 'border-[#0754B8]/12'
          }`}
        >
          {/* Column 1 — Official EVERYKR Branding */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-3">
            <Link
              to="/"
              className="inline-flex items-center group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8]"
              aria-label="EveryKR — Everything Korea, One Platform"
            >
              <EveryKrAnimatedLogo
                variant="static"
                isNight={isNight}
                imgClassName="h-8 sm:h-10"
              />
            </Link>

            <div
              className={`text-[11px] font-bold tracking-[0.16em] uppercase ${
                isNight ? 'text-[#60A5FA]' : 'text-[#0754B8]'
              }`}
            >
              {copy.tagline}
            </div>

            <p
              className={`text-xs sm:text-sm leading-relaxed max-w-sm ${
                isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
              }`}
            >
              {copy.desc}
            </p>
          </div>

          {/* Column 2 — Quick Links */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4
              className={`text-xs font-extrabold uppercase tracking-[0.14em] ${
                isNight ? 'text-white' : 'text-[#061B49]'
              }`}
            >
              {copy.col2Title}
            </h4>
            <ul
              className={`space-y-2 text-xs sm:text-sm ${
                isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
              }`}
            >
              {[
                { to: '/universities', label: copy.universities },
                { to: '/learn-hangul', label: copy.learnKorean },
                { to: '/housing', label: copy.accommodation },
                { to: '/scholarships', label: copy.scholarships },
                { to: '/community', label: copy.community },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`transition-colors ${
                      isNight
                        ? 'hover:text-white'
                        : 'hover:text-[#0754B8]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Other Services */}
          <div className="lg:col-span-2 space-y-2.5">
            <h4
              className={`text-xs font-extrabold uppercase tracking-[0.14em] ${
                isNight ? 'text-white' : 'text-[#061B49]'
              }`}
            >
              {copy.col3Title}
            </h4>
            <ul
              className={`space-y-2 text-xs sm:text-sm ${
                isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
              }`}
            >
              {[
                { to: '/discover-korea', label: copy.discoverKorea },
                { to: '/visa', label: copy.studentVisaGuide },
                { to: '/jobs', label: copy.partTimeJobs },
                { to: '/transportation', label: 'Tickets & Transport' },
                { to: '/sim', label: 'Free SIM Services' },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`transition-colors ${
                      isNight
                        ? 'hover:text-white'
                        : 'hover:text-[#0754B8]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Contact */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4
              className={`text-xs font-extrabold uppercase tracking-[0.14em] ${
                isNight ? 'text-white' : 'text-[#061B49]'
              }`}
            >
              {copy.col4Title}
            </h4>
            <ul
              className={`space-y-2 text-xs sm:text-sm ${
                isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
              }`}
            >
              <li>
                <Link
                  to="/about"
                  className={`transition-colors ${
                    isNight
                      ? 'hover:text-[#FFFFFF]'
                      : 'text-[#526685] hover:text-[#0754B8]'
                  }`}
                >
                  {copy.aboutEverykr}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className={`transition-colors ${
                    isNight
                      ? 'hover:text-[#FFFFFF]'
                      : 'text-[#526685] hover:text-[#0754B8]'
                  }`}
                >
                  {copy.studentSupport}
                </Link>
              </li>
              <li className="pt-0.5">
                <a
                  href="mailto:info@everykr.com"
                  className={`inline-flex items-center gap-1.5 transition-colors break-all ${
                    isNight
                      ? 'text-[#DCE5F0] hover:text-[#60A5FA]'
                      : 'text-[#0754B8] hover:text-[#0875E8] font-medium'
                  }`}
                >
                  <Mail
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isNight ? 'text-[#60A5FA]' : 'text-[#0875E8]'
                    }`}
                  />
                  <span>info@everykr.com</span>
                </a>
              </li>
              <li
                className={`inline-flex items-center gap-1.5 ${
                  isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
                }`}
              >
                <MapPin
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isNight ? 'text-[#FFB800]' : 'text-[#0754B8]'
                  }`}
                />
                <span>{copy.location}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className={`pt-4 flex flex-wrap items-center justify-start gap-x-2.5 gap-y-1.5 text-xs ${
            isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
          }`}
        >
          <span>
            &copy; {currentYear} EVERYKR. {copy.copyright}
          </span>
          <span
            className={`select-none ${
              isNight ? 'text-white/20' : 'text-[#0754B8]/25'
            }`}
            aria-hidden="true"
          >
            |
          </span>
          <FooterDeveloperCreditTrigger isNight={isNight} />
          <span
            className={`select-none ${
              isNight ? 'text-white/20' : 'text-[#0754B8]/25'
            }`}
            aria-hidden="true"
          >
            |
          </span>
          <Link
            to="/privacy"
            className={`transition-colors ${
              isNight
                ? 'hover:text-[#FFFFFF]'
                : 'text-[#526685] hover:text-[#0754B8]'
            }`}
          >
            {copy.privacy}
          </Link>
          <span
            className={`select-none ${
              isNight ? 'text-white/20' : 'text-[#0754B8]/25'
            }`}
            aria-hidden="true"
          >
            |
          </span>
          <Link
            to="/terms"
            className={`transition-colors ${
              isNight
                ? 'hover:text-[#FFFFFF]'
                : 'text-[#526685] hover:text-[#0754B8]'
            }`}
          >
            {copy.terms}
          </Link>
        </div>
      </div>
    </footer>
  );
};

