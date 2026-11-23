import React, { useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { VISA_CATEGORIES } from '../data/mockData';
import { getUniversitySlug } from '../utils/seoRoutes';
import { isApprovedPriorityUniversity } from '../data/universitiesMaster';
import {
  Search,
  X,
  GraduationCap,
  Briefcase,
  Home,
  FileText,
  Users,
  ArrowRight
} from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    searchQuery,
    setSearchQuery,
    universitiesList,
    jobsList,
    accommodationList,
    posts,
    setSelectedJob,
    setSelectedAccommodation,
    setActivePage
  } = useApp();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    if (!isSearchModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setIsSearchModalOpen]);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();

    const matchedUnis = universitiesList
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.koreanName.includes(q) ||
          u.city.toLowerCase().includes(q) ||
          u.programs.some((p) => p.toLowerCase().includes(q)) ||
          (u.aliases || []).some((a) => a.toLowerCase().includes(q))
      )
      .slice(0, 5);

    const matchedJobs = jobsList
      .filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      )
      .slice(0, 3);

    const matchedHousing = accommodationList
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) || a.district.toLowerCase().includes(q)
      )
      .slice(0, 2);

    const matchedVisas = VISA_CATEGORIES.filter(
      (v) =>
        v.code.toLowerCase().includes(q) || v.title.toLowerCase().includes(q)
    ).slice(0, 2);

    const matchedPosts = posts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      )
      .slice(0, 2);

    return {
      unis: matchedUnis,
      jobs: matchedJobs,
      housing: matchedHousing,
      visas: matchedVisas,
      posts: matchedPosts,
      total:
        matchedUnis.length +
        matchedJobs.length +
        matchedHousing.length +
        matchedVisas.length +
        matchedPosts.length
    };
  }, [searchQuery, universitiesList, jobsList, accommodationList, posts]);

  if (!isSearchModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#061B49]/55 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSearchModalOpen(false);
      }}
    >
      <div className="relative w-full max-w-2xl ekr-glass-modal rounded-2xl overflow-hidden animate-fade-in flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200/60 dark:border-white/12 flex items-center gap-3 bg-white/40 dark:bg-white/5">
          <Search className="w-5 h-5 text-[#0754B8] dark:text-[#60A5FA] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search universities, visas (D-2/D-4), jobs, one-rooms, guides..."
            className="w-full text-sm sm:text-base text-[#10213D] dark:text-white placeholder-[#526685]/70 dark:placeholder-[#B8C9E5]/60 focus:outline-none bg-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(false)}
            className="px-2.5 py-1 text-xs font-semibold text-[#526685] dark:text-[#B8C9E5] hover:text-[#10213D] dark:hover:text-white ekr-glass-subtle rounded-lg cursor-pointer transition-colors"
          >
            Esc
          </button>
        </div>

        {/* Results Area */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
          {!results ? (
            <div className="py-8 text-center text-xs text-[#526685] dark:text-[#B8C9E5]">
              <p>Type keywords to search across EVERYKR platform.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setSearchQuery('Hanyang')}
                  className="px-3 py-1.5 ekr-glass-subtle rounded-xl text-[#10213D] dark:text-white hover:bg-white/80 dark:hover:bg-white/15 cursor-pointer transition-colors font-medium"
                >
                  Hanyang
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('D-2')}
                  className="px-3 py-1.5 ekr-glass-subtle rounded-xl text-[#10213D] dark:text-white hover:bg-white/80 dark:hover:bg-white/15 cursor-pointer transition-colors font-medium"
                >
                  D-2 Visa
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('Part-time')}
                  className="px-3 py-1.5 ekr-glass-subtle rounded-xl text-[#10213D] dark:text-white hover:bg-white/80 dark:hover:bg-white/15 cursor-pointer transition-colors font-medium"
                >
                  Part-time Jobs
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('Sinchon')}
                  className="px-3 py-1.5 ekr-glass-subtle rounded-xl text-[#10213D] dark:text-white hover:bg-white/80 dark:hover:bg-white/15 cursor-pointer transition-colors font-medium"
                >
                  Sinchon Studio
                </button>
              </div>
            </div>
          ) : results.total === 0 ? (
            <div className="py-8 text-center text-xs text-[#526685] dark:text-[#B8C9E5]">
              No results found matching &ldquo;{searchQuery}&rdquo;. Try broader keywords.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Universities matches */}
              {results.unis.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                    <span>Universities</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.unis.map((u) => {
                      const isPriority = isApprovedPriorityUniversity(u);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setIsSearchModalOpen(false);
                            navigate(`/universities/${getUniversitySlug(u)}`);
                          }}
                          className="p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 border border-transparent hover:border-white/60 dark:hover:border-white/15 cursor-pointer flex items-center justify-between gap-2 transition-all"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#10213D] dark:text-white">
                              {u.officialName || u.name}
                            </span>
                            <span className="text-[11px] text-[#526685] dark:text-[#B8C9E5] ml-2">
                              {u.koreanName} · {u.city} ·{' '}
                              {isPriority
                                ? `Priority #${u.whitelistOrder ?? '—'}`
                                : 'Preserved Archive (Unverified)'}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#526685] dark:text-[#B8C9E5] shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Jobs matches */}
              {results.jobs.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                    <span>Jobs &amp; Careers</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.jobs.map((j) => (
                      <div
                        key={j.id}
                        onClick={() => {
                          setActivePage('jobs');
                          setSelectedJob(j);
                          setIsSearchModalOpen(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 border border-transparent hover:border-white/60 dark:hover:border-white/15 cursor-pointer flex items-center justify-between transition-all"
                      >
                        <div>
                          <span className="text-xs font-bold text-[#10213D] dark:text-white">{j.title}</span>
                          <span className="text-[11px] text-[#526685] dark:text-[#B8C9E5] ml-2">
                            {j.company} · {j.salaryKRW}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#526685] dark:text-[#B8C9E5]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Housing matches */}
              {results.housing.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                    <span>Accommodation</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.housing.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => {
                          setActivePage('accommodation');
                          setSelectedAccommodation(a);
                          setIsSearchModalOpen(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 border border-transparent hover:border-white/60 dark:hover:border-white/15 cursor-pointer flex items-center justify-between transition-all"
                      >
                        <div>
                          <span className="text-xs font-bold text-[#10213D] dark:text-white">{a.title}</span>
                          <span className="text-[11px] text-[#526685] dark:text-[#B8C9E5] ml-2">
                            {a.district} · ₩{(a.monthlyRentKRW / 10000).toFixed(0)}만/mo
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#526685] dark:text-[#B8C9E5]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visa guides */}
              {results.visas.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                    <span>Visa &amp; Immigration</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.visas.map((v) => (
                      <div
                        key={v.code}
                        onClick={() => {
                          setIsSearchModalOpen(false);
                          navigate(`/visa?code=${encodeURIComponent(v.code)}`);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 border border-transparent hover:border-white/60 dark:hover:border-white/15 cursor-pointer flex items-center justify-between transition-all"
                      >
                        <div>
                          <span className="text-xs font-bold text-[#10213D] dark:text-white">{v.title}</span>
                          <span className="text-[11px] text-[#526685] dark:text-[#B8C9E5] ml-2">{v.stayDuration}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#526685] dark:text-[#B8C9E5]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Community posts */}
              {results.posts.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-[#526685] dark:text-[#B8C9E5] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0754B8] dark:text-[#60A5FA]" />
                    <span>Community Discussions</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.posts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActivePage('community');
                          setIsSearchModalOpen(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 border border-transparent hover:border-white/60 dark:hover:border-white/15 cursor-pointer flex items-center justify-between transition-all"
                      >
                        <div>
                          <span className="text-xs font-bold text-[#10213D] dark:text-white">{p.title}</span>
                          <span className="text-[11px] text-[#526685] dark:text-[#B8C9E5] ml-2">by {p.authorName}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#526685] dark:text-[#B8C9E5]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
