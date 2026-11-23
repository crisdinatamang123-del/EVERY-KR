import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Search,
  ChevronRight,
  Bell,
  CheckCircle2,
  FileText,
  Users
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  category: 'Immigration & Visa' | 'University Admissions' | 'Scholarships' | 'Student Living';
  date: string;
  source: string;
  sourceUrl: string;
  summary: string;
  highlights: string[];
}

interface EventItem {
  id: string;
  title: string;
  category: 'Career Fair' | 'GKS & Admissions' | 'TOPIK & Language' | 'Cultural Exchange';
  date: string;
  timeKST: string;
  city: string;
  venue: string;
  organizer: string;
  registrationType: string;
  description: string;
}

const KOREA_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Ministry of Justice Expands D-2 Student Part-Time Work Permit Hours for TOPIK 4+ Holders',
    category: 'Immigration & Visa',
    date: 'November 2026',
    source: 'Korea Immigration Service (HiKorea)',
    sourceUrl: 'https://www.hikorea.go.kr',
    summary:
      'International undergraduate and graduate students holding valid TOPIK certificates and maintaining a C+ (2.0+) GPA qualify for extended S-3 part-time work hours during academic semesters.',
    highlights: [
      'Up to 25–30 hours/week on weekdays for certified undergraduate and graduate scholars',
      'Mandatory online S-3 employer verification on HiKorea prior to starting employment',
      'Manufacturing, construction, and gig-delivery work remain strictly prohibited'
    ]
  },
  {
    id: 'news-2',
    title: 'NIIED Announces 2027 Global Korea Scholarship (GKS) Quota Increase for STEM & Regional Tracks',
    category: 'Scholarships',
    date: 'November 2026',
    source: 'Study in Korea (NIIED)',
    sourceUrl: 'https://www.studyinkorea.go.kr',
    summary:
      'The National Institute for International Education (NIIED) has expanded GKS University Track allocations for engineering, AI, semiconductors, and regional national universities.',
    highlights: [
      'Dedicated R-GKS quota for accredited universities outside the Seoul metropolitan area',
      '100% tuition coverage, round-trip airfare, and monthly living allowance included',
      '1-year intensive Korean language institute training before degree matriculation'
    ]
  },
  {
    id: 'news-3',
    title: 'NHIS National Health Insurance Automatic Enrollment & Student Contribution Update',
    category: 'Student Living',
    date: 'October 2026',
    source: 'National Health Insurance Service (NHIS)',
    sourceUrl: 'https://www.nhis.or.kr',
    summary:
      'All D-2 degree students and D-4 language trainees residing in South Korea for over 6 months are automatically enrolled in the NHIS international student reduction tier.',
    highlights: [
      'International students receive a statutory reduction on standard local subscriber premiums',
      'Covers 70%–80% of inpatient, outpatient, dental, and prescription medical costs',
      'Unpaid NHIS balances can delay D-2 visa extension or D-10 job-seeking conversion'
    ]
  },
  {
    id: 'news-4',
    title: 'Spring & Fall 2027 International Admissions: Apostille & Consular Verification Reminder',
    category: 'University Admissions',
    date: 'October 2026',
    source: 'Korean Council for University Education',
    sourceUrl: 'https://www.academyinfo.go.kr',
    summary:
      'Korean universities require all foreign academic transcripts, diplomas, and family relationship certificates to carry an official Hague Apostille or Korean Embassy authentication.',
    highlights: [
      'Begin document apostille 6–8 weeks prior to university online application deadlines',
      'Bank balance certificates must be issued within 30 days of submission ($20,000 USD benchmark)',
      'Digital Apostille verification is accepted by major Seoul and national universities'
    ]
  },
  {
    id: 'news-5',
    title: 'Seoul Climate Card Youth Discount Available for International University Students',
    category: 'Student Living',
    date: 'September 2026',
    source: 'Seoul Metropolitan Government',
    sourceUrl: 'https://english.seoul.go.kr',
    summary:
      'International students aged 19–39 with a valid Alien Registration Card (ARC) can register for the discounted ₩55,000 30-day unlimited Seoul subway and bus Climate Card.',
    highlights: [
      'Unlimited rides on Seoul metropolitan subways, blue/green/village buses, and Ttareungi bikes',
      'Mobile Climate Card available on Android; physical card sold at convenience stores for iOS users',
      'Requires ARC alien registration number verification on T-Money portal for youth rebate'
    ]
  }
];

const KOREA_EVENTS_ITEMS: EventItem[] = [
  {
    id: 'evt-1',
    title: '2026–2027 KOTRA & NIIED International Student Career Fair in Seoul (COEX)',
    category: 'Career Fair',
    date: 'December 04, 2026',
    timeKST: '10:00 – 17:00 KST',
    city: 'Seoul',
    venue: 'COEX Hall C, Gangnam-gu, Seoul',
    organizer: 'KOTRA & Ministry of Education',
    registrationType: 'Free Pre-Registration (D-2 / D-10 Visa Holders)',
    description:
      'Meet 120+ Korean tech companies, global conglomerates, and E-7 visa sponsoring employers. Includes on-site resume clinics and Ministry of Justice D-10/E-7 visa consultations.'
  },
  {
    id: 'evt-2',
    title: 'Global Korea Scholarship (GKS) & SKY University Admissions Briefing Webinar',
    category: 'GKS & Admissions',
    date: 'December 12, 2026',
    timeKST: '14:00 – 16:30 KST',
    city: 'Online & Seoul',
    venue: 'NIIED Global Center (Jongno-gu) & Live Stream',
    organizer: 'EveryKR Academic Advisory & Partner OIA Network',
    registrationType: 'Open to Prospective & Current Scholars',
    description:
      'Comprehensive walkthrough of Embassy vs. University Track strategies, Study Plan essay structure, professor lab contact etiquette, and Apostille document preparation.'
  },
  {
    id: 'evt-3',
    title: 'Intensive TOPIK II Writing (Questions 51–54) Weekend Workshop',
    category: 'TOPIK & Language',
    date: 'December 19, 2026',
    timeKST: '13:00 – 17:00 KST',
    city: 'Seoul',
    venue: 'Sinchon International Student Hub (Mapo-gu)',
    organizer: 'EveryKR Language Guild',
    registrationType: 'Free for Registered EveryKR Students',
    description:
      'Master graph analysis (Question 53) and 600-character argumentative essay structure (Question 54) to jump from TOPIK Level 3 to Level 5 before university graduation.'
  },
  {
    id: 'evt-4',
    title: 'Busan & Gyeongsang International Scholar Networking & Housing Clinic',
    category: 'Cultural Exchange',
    date: 'January 09, 2027',
    timeKST: '15:00 – 18:30 KST',
    city: 'Busan',
    venue: 'Haeundae Global Youth Center, Busan',
    organizer: 'Busan Global Foundation & EveryKR',
    registrationType: 'Free RSVP (Includes Legal Lease Review)',
    description:
      'Connect with international students from PNU, Pukyong National, and Dong-A University. Certified real estate counselors provide free Jeonse/Wolse housing contract checks.'
  }
];

interface NewsEventsModuleProps {
  mode: 'news' | 'events';
}

export const NewsEventsModule: React.FC<NewsEventsModuleProps> = ({ mode }) => {
  const { addReminder, currentUser, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [rsvpIds, setRsvpIds] = useState<string[]>([]);

  const filteredNews = useMemo(() => {
    return KOREA_NEWS_ITEMS.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchQuery, selectedCategory]);

  const filteredEvents = useMemo(() => {
    return KOREA_EVENTS_ITEMS.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchQuery, selectedCategory]);

  const handleEventRsvp = (evt: EventItem) => {
    if (rsvpIds.includes(evt.id)) {
      setRsvpIds(prev => prev.filter(id => id !== evt.id));
      showToast(`Removed RSVP for ${evt.title}`);
      return;
    }
    setRsvpIds(prev => [...prev, evt.id]);
    if (currentUser) {
      addReminder({
        title: `Event: ${evt.title}`,
        dueDate: '2026-12-04',
        category: 'Personal',
        notes: `${evt.venue} (${evt.timeKST})`
      });
    }
    showToast(`RSVP confirmed for "${evt.title}"!`);
  };

  return (
    <section className="py-10 bg-transparent text-[#10213D] dark:text-white min-h-[80vh] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5]">
          <Link to="/" className="hover:text-[#10213D] dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#0754B8] dark:text-[#60A5FA]">
            {mode === 'news' ? 'Korea Student News & Policy Updates' : 'International Student Events & Career Fairs'}
          </span>
        </nav>

        {/* Header + Mode Switch Links */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#0754B8] dark:text-[#60A5FA] uppercase tracking-wider">
              <span className="w-5 h-0.5 bg-[#FFB800] rounded-full" aria-hidden="true" />
              <span>
                {mode === 'news' ? 'Verified Immigration & Academic Briefings' : 'Networking, Career Fairs & Workshops'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#061B49] dark:text-white tracking-tight mt-1.5">
              {mode === 'news' ? 'South Korea Student News & Policy Hub' : 'International Student Events in Korea'}
            </h1>
            <p className="text-sm text-[#526685] dark:text-[#B8C9E5] mt-1.5 max-w-2xl leading-relaxed">
              {mode === 'news'
                ? 'Stay informed on official Ministry of Justice visa rules, NIIED scholarship announcements, NHIS health insurance updates, and campus deadlines.'
                : 'Discover upcoming career fairs, GKS admission workshops, TOPIK writing clinics, and regional student meetups across South Korea.'}
            </p>
          </div>

          <div className="flex items-center gap-2 p-1.5 ekr-glass-panel rounded-xl self-start md:self-auto">
            <Link
              to="/news"
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                mode === 'news'
                  ? 'ekr-glass-btn-primary text-white'
                  : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
              }`}
            >
              News &amp; Policy (/news)
            </Link>
            <Link
              to="/events"
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                mode === 'events'
                  ? 'ekr-glass-btn-primary text-white'
                  : 'text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white'
              }`}
            >
              Student Events (/events)
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="ekr-glass-panel p-5 rounded-2xl flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#526685] dark:text-[#B8C9E5] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mode === 'news'
                  ? 'Search news by keyword (e.g., HiKorea, S-3 work permit, NHIS, GKS)...'
                  : 'Search events by city, career fair, TOPIK, or organizer...'
              }
              className="ekr-glass-input w-full pl-10 pr-4 py-2.5 text-xs rounded-xl"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="ekr-glass-input px-3.5 py-2.5 text-xs rounded-xl"
          >
            <option value="All" className="bg-white dark:bg-[#0B204A]">All Categories</option>
            {mode === 'news' ? (
              <>
                <option value="Immigration & Visa" className="bg-white dark:bg-[#0B204A]">Immigration &amp; Visa</option>
                <option value="University Admissions" className="bg-white dark:bg-[#0B204A]">University Admissions</option>
                <option value="Scholarships" className="bg-white dark:bg-[#0B204A]">Scholarships</option>
                <option value="Student Living" className="bg-white dark:bg-[#0B204A]">Student Living</option>
              </>
            ) : (
              <>
                <option value="Career Fair" className="bg-white dark:bg-[#0B204A]">Career Fair</option>
                <option value="GKS & Admissions" className="bg-white dark:bg-[#0B204A]">GKS &amp; Admissions</option>
                <option value="TOPIK & Language" className="bg-white dark:bg-[#0B204A]">TOPIK &amp; Language</option>
                <option value="Cultural Exchange" className="bg-white dark:bg-[#0B204A]">Cultural Exchange</option>
              </>
            )}
          </select>
        </div>

        {/* Content List */}
        {mode === 'news' ? (
          <div className="space-y-4">
            {filteredNews.map((item) => (
              <article
                key={item.id}
                className="ekr-glass-card rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2 text-xs text-[#526685] dark:text-[#B8C9E5] flex-wrap">
                  <span className="font-semibold text-[#0754B8] dark:text-[#60A5FA]">{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>Source: {item.source}</span>
                </div>

                <h2 className="text-lg font-bold text-[#10213D] dark:text-white leading-snug">
                  {item.title}
                </h2>

                <p className="text-xs sm:text-sm text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                  {item.summary}
                </p>

                <div className="p-4 rounded-xl ekr-glass-subtle space-y-1.5">
                  <div className="text-xs font-bold text-[#10213D] dark:text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                    <span>Key Takeaways for International Students</span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#526685] dark:text-[#B8C9E5]">
                    {item.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <Link
                    to="/visa"
                    className="font-semibold text-[#0754B8] dark:text-[#60A5FA] hover:underline"
                  >
                    Open Visa &amp; ARC Checklist →
                  </Link>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white transition-colors"
                  >
                    <span>Official Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredEvents.map((evt) => {
              const isRsvped = rsvpIds.includes(evt.id);
              return (
                <div
                  key={evt.id}
                  className="ekr-glass-card rounded-2xl p-6 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-[#0754B8] dark:text-[#60A5FA] font-semibold flex-wrap">
                      <span>{evt.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{evt.city}</span>
                      <span aria-hidden="true">·</span>
                      <span>{evt.organizer}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-[#10213D] dark:text-white leading-snug">
                      {evt.title}
                    </h2>

                    <p className="text-xs text-[#526685] dark:text-[#B8C9E5] leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="p-3.5 rounded-xl ekr-glass-subtle space-y-1.5 text-xs text-[#10213D] dark:text-[#DCE8FA]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                        <span className="font-semibold">{evt.date}</span>
                        <span aria-hidden="true">·</span>
                        <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        <span>{evt.timeKST}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
                        <span>{evt.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{evt.registrationType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                    <Link
                      to="/community"
                      className="text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white transition-colors"
                    >
                      Discuss in Community →
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleEventRsvp(evt)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isRsvped
                          ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-sm'
                          : 'ekr-glass-btn-primary text-white'
                      }`}
                    >
                      {isRsvped ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>RSVP Confirmed</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5" />
                          <span>RSVP &amp; Add Reminder</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
