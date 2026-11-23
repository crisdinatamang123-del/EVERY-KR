import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type {
  UniversityAdmissionDeadlineRecord,
  UniversityDeadlineCarouselConfig,
} from '../../types';
import {
  DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG,
  computeKstDeadlineCountdown,
  formatDeadlineDateKst,
  resolveRenderableUniversityLogoUrl,
} from '../../utils/universityDeadlineUtils';
import { subscribePublicUniversityDeadlines } from '../../services/universityDeadlinesService';
import { APPROVED_25_IDS, PRESERVED_ARCHIVE_IDS } from '../../data/universitiesMaster';

export interface UniversityOfficialLogoProps {
  universityName: string;
  logoDownloadUrl?: string;
  logoStoragePath?: string;
  logoFallbackDataUrl?: string;
  alt?: string;
  initialsClassName?: string;
  loading?: 'eager' | 'lazy';
}

/**
 * Shared resilient official university logo renderer used across:
 * - Admin Upload Dropzone Preview
 * - Admin Deadline Table Rows
 * - Admin Live Card Preview
 * - Public Homepage University Admission Deadline Carousel
 *
 * Resolves primary download URL -> API binary logo endpoint -> compact fallback data URL,
 * and falls back to clean university initials ONLY if every image candidate is absent or fails.
 */
export const UniversityOfficialLogo: React.FC<UniversityOfficialLogoProps> = ({
  universityName,
  logoDownloadUrl,
  logoStoragePath,
  logoFallbackDataUrl,
  alt,
  initialsClassName = 'text-xs font-extrabold tracking-tight text-[#0B1C3D] select-none',
  loading = 'lazy',
}) => {
  const candidates = useMemo(() => {
    const list: string[] = [];
    const pushUnique = (val?: string | null) => {
      const trimmed = String(val || '').trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    };

    const primaryUrl = resolveRenderableUniversityLogoUrl(logoDownloadUrl, logoStoragePath);
    pushUnique(primaryUrl);

    const rawPath = String(logoStoragePath || '').trim();
    if (rawPath.startsWith('university-deadlines/')) {
      const subpath = rawPath.slice('university-deadlines/'.length);
      if (subpath.split('/').filter(Boolean).length === 2) {
        pushUnique(`/uploads/university-deadlines/${subpath}`);
        pushUnique(`/api/cms/university-deadlines/logo/${subpath}`);
      }
    } else if (primaryUrl.startsWith('/uploads/university-deadlines/')) {
      const subpath = primaryUrl.slice('/uploads/university-deadlines/'.length);
      if (subpath.split('/').filter(Boolean).length === 2) {
        pushUnique(`/api/cms/university-deadlines/logo/${subpath}`);
      }
    }

    if (logoFallbackDataUrl && logoFallbackDataUrl.startsWith('data:image/')) {
      pushUnique(logoFallbackDataUrl);
    }

    return list;
  }, [logoDownloadUrl, logoStoragePath, logoFallbackDataUrl]);

  const candidatesKey = candidates.join('|');
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [candidatesKey]);

  const initials = useMemo(() => {
    const words = String(universityName || 'U')
      .split(/\s+/)
      .filter((w) => w.length > 0 && !['of', 'the', 'and'].includes(w.toLowerCase()));
    return words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
  }, [universityName]);

  const activeSrc = candidateIdx < candidates.length ? candidates[candidateIdx] : '';

  if (activeSrc) {
    return (
      <img
        key={activeSrc}
        src={activeSrc}
        alt={alt || `${universityName} official logo`}
        referrerPolicy="no-referrer"
        loading={loading}
        onError={() => setCandidateIdx((prev) => prev + 1)}
        className="w-full h-full object-contain select-none"
      />
    );
  }

  return <span className={initialsClassName}>{initials || 'KR'}</span>;
};

export interface UniversityDeadlineCardProps {
  record: UniversityAdmissionDeadlineRecord;
  nowMs: number;
  interactiveLink?: boolean;
  isNight?: boolean;
}

/**
 * Shared Homepage & Admin Live Preview Card.
 * Displays ONLY the 4 authorized elements:
 * 1. Official university logo
 * 2. University name
 * 3. Application deadline
 * 4. Automatic KST countdown (D-30, D-15, D-5, D-1, Closing Today)
 */
export const UniversityDeadlineCard: React.FC<UniversityDeadlineCardProps> = ({
  record,
  nowMs,
  interactiveLink = true,
  isNight = true,
}) => {
  const countdown = useMemo(
    () => computeKstDeadlineCountdown(record.applicationDeadline, nowMs),
    [record.applicationDeadline, nowMs]
  );

  const formattedDeadline = useMemo(
    () => formatDeadlineDateKst(record.applicationDeadline),
    [record.applicationDeadline]
  );

  const countdownColorClass =
    countdown.urgency === 'closing_today'
      ? isNight
        ? 'text-amber-300'
        : 'text-amber-700'
      : countdown.urgency === 'urgent'
      ? isNight
        ? 'text-sky-300'
        : 'text-[#0875E8]'
      : countdown.urgency === 'closed'
      ? isNight
        ? 'text-slate-400'
        : 'text-slate-500'
      : isNight
      ? 'text-[#60A5FA]'
      : 'text-[#0754B8]';

  const hasKnownProfile =
    APPROVED_25_IDS.has(record.universityId) || PRESERVED_ARCHIVE_IDS.has(record.universityId);

  const cardInner = (
    <div className="ekr-glass-card group relative flex items-center gap-4 w-[268px] sm:w-[292px] lg:w-[308px] shrink-0 rounded-2xl p-4 hover:-translate-y-0.5">
      {/* 1. Official University Logo */}
      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-white/95 border border-[#0754B8]/12 dark:border-white/20 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-xs">
        <UniversityOfficialLogo
          universityName={record.universityName}
          logoDownloadUrl={record.logoDownloadUrl}
          logoStoragePath={record.logoStoragePath}
          logoFallbackDataUrl={record.logoFallbackDataUrl}
        />
      </div>

      {/* Right Column: Name + Deadline + Automatic Countdown */}
      <div className="min-w-0 flex-1">
        {/* 2. University Name */}
        <h3
          className={`text-sm sm:text-[15px] font-bold tracking-tight truncate transition-colors ${
            isNight
              ? 'text-white group-hover:text-[#93C5FD]'
              : 'text-[#10213D] group-hover:text-[#0754B8]'
          }`}
        >
          {record.universityName}
        </h3>

        {/* Divider */}
        <div
          className={`my-2 h-px ${isNight ? 'bg-white/12' : 'bg-[#0754B8]/10'}`}
        />

        {/* 3. Application Deadline & 4. Automatic Countdown */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 font-medium tabular-nums whitespace-nowrap ${
              isNight ? 'text-[#B8C9E5]' : 'text-[#526685]'
            }`}
          >
            <Calendar
              className={`w-3.5 h-3.5 shrink-0 ${
                isNight ? 'text-[#60A5FA]' : 'text-[#0875E8]'
              }`}
              aria-hidden="true"
            />
            <span>{formattedDeadline}</span>
          </span>
          <span
            className={`font-mono text-xs sm:text-[13px] font-bold tracking-tight tabular-nums whitespace-nowrap shrink-0 ${countdownColorClass}`}
          >
            {countdown.label}
          </span>
        </div>
      </div>
    </div>
  );

  if (interactiveLink && hasKnownProfile) {
    return (
      <Link
        to={`/universities/${record.universityId}`}
        className="block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] rounded-2xl"
      >
        {cardInner}
      </Link>
    );
  }

  return cardInner;
};

export interface UniversityDeadlineCarouselTrackProps {
  records: UniversityAdmissionDeadlineRecord[];
  nowMs: number;
  interactiveLinks?: boolean;
  isNight?: boolean;
}

/**
 * Floating horizontal carousel track with smooth auto-scrolling, seamless looping,
 * pause-on-hover, and Previous / Next arrow controls.
 */
export const UniversityDeadlineCarouselTrack: React.FC<UniversityDeadlineCarouselTrackProps> = ({
  records,
  nowMs,
  interactiveLinks = true,
  isNight = true,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isPausedRef = useRef(false);
  const manualPauseUntilRef = useRef(0);
  const accumulatorRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Duplicate track items when >= 2 records so horizontal auto-scroll loops seamlessly without jump
  const shouldLoop = records.length >= 2;
  const renderedItems = useMemo(() => {
    if (!shouldLoop) return records.map((r) => ({ key: r.id, record: r }));
    return [
      ...records.map((r) => ({ key: `primary-${r.id}`, record: r })),
      ...records.map((r) => ({ key: `clone-${r.id}`, record: r })),
    ];
  }, [records, shouldLoop]);

  useEffect(() => {
    if (!shouldLoop || prefersReducedMotion) return;
    let frameId = 0;
    let lastTs = performance.now();

    const step = (ts: number) => {
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      const container = scrollRef.current;

      if (
        container &&
        !isPausedRef.current &&
        Date.now() >= manualPauseUntilRef.current &&
        container.scrollWidth > container.clientWidth
      ) {
        // ~34px per second smooth glide
        accumulatorRef.current += (dt * 34) / 1000;
        if (accumulatorRef.current >= 0.5) {
          const delta = accumulatorRef.current;
          accumulatorRef.current = 0;
          const halfWidth = container.scrollWidth / 2;
          if (halfWidth > 0) {
            const nextLeft = container.scrollLeft + delta;
            container.scrollLeft = nextLeft >= halfWidth ? nextLeft - halfWidth : nextLeft;
          }
        }
      }
      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [shouldLoop, prefersReducedMotion, renderedItems.length]);

  const handleManualStep = (direction: 'prev' | 'next') => {
    const container = scrollRef.current;
    if (!container) return;

    manualPauseUntilRef.current = Date.now() + 2600;
    const cardStep = 324;
    const halfWidth = shouldLoop ? container.scrollWidth / 2 : container.scrollWidth;

    if (shouldLoop && halfWidth > 0) {
      if (direction === 'prev' && container.scrollLeft <= 8) {
        container.scrollLeft = halfWidth;
      } else if (direction === 'next' && container.scrollLeft >= halfWidth) {
        container.scrollLeft = container.scrollLeft - halfWidth;
      }
    }

    container.scrollBy({
      left: direction === 'next' ? cardStep : -cardStep,
      behavior: 'smooth',
    });
  };

  return (
    <div
      className="ekr-glass-panel relative rounded-3xl p-4 sm:p-5 lg:p-6 overflow-hidden"
      onMouseEnter={() => {
        isPausedRef.current = true;
      }}
      onMouseLeave={() => {
        isPausedRef.current = false;
      }}
      onTouchStart={() => {
        isPausedRef.current = true;
      }}
      onTouchEnd={() => {
        isPausedRef.current = false;
      }}
      onFocusCapture={() => {
        isPausedRef.current = true;
      }}
      onBlurCapture={() => {
        isPausedRef.current = false;
      }}
    >
      {/* Header Row + Previous / Next Navigation */}
      <div className="relative z-10 flex items-center justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h2
            className={`text-base sm:text-lg font-extrabold tracking-tight ${
              isNight ? 'text-white' : 'text-[#10213D]'
            }`}
          >
            University Admission Deadlines
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleManualStep('prev')}
            aria-label="Previous university deadline"
            className={`ekr-glass-subtle w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
              isNight
                ? 'text-[#DCE5F0] hover:bg-[#0875E8] hover:text-white'
                : 'text-[#0754B8] hover:bg-[#0754B8] hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleManualStep('next')}
            aria-label="Next university deadline"
            className={`ekr-glass-subtle w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0875E8] ${
              isNight
                ? 'text-[#DCE5F0] hover:bg-[#0875E8] hover:text-white'
                : 'text-[#0754B8] hover:bg-[#0754B8] hover:text-white'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Floating Carousel Track */}
      <div className="relative z-10">
        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {renderedItems.map((item) => (
            <UniversityDeadlineCard
              key={item.key}
              record={item.record}
              nowMs={nowMs}
              interactiveLink={interactiveLinks}
              isNight={isNight}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Public Homepage University Admission Deadline Carousel.
 * Placed immediately below the 3D rotating Earth globe Hero section and
 * immediately above "Platform Ecosystem — Everything Korea. One Platform."
 */
export const UniversityDeadlineCarousel: React.FC<{ isNight?: boolean }> = ({
  isNight = true,
}) => {
  const [config, setConfig] = useState<UniversityDeadlineCarouselConfig>(
    DEFAULT_UNIVERSITY_DEADLINE_CAROUSEL_CONFIG
  );
  const [deadlines, setDeadlines] = useState<UniversityAdmissionDeadlineRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Subscribe to real-time Firestore & CMS updates
  useEffect(() => {
    const unsubscribe = subscribePublicUniversityDeadlines(
      ({ config: nextCfg, deadlines: nextList }) => {
        setConfig(nextCfg);
        setDeadlines(nextList);
        setLoaded(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Automatic KST countdown ticker (recalculates every 30s without page refresh)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Show only published, non-expired (active) deadlines in displayOrder
  const activePublishedDeadlines = useMemo(() => {
    return deadlines.filter((rec) => {
      if (!rec.published || rec.publicationStatus !== 'published') return false;
      const countdown = computeKstDeadlineCountdown(rec.applicationDeadline, nowMs);
      return !countdown.isExpired;
    });
  }, [deadlines, nowMs]);

  if (!loaded) {
    return null;
  }

  if (!config.carouselEnabled || activePublishedDeadlines.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="University Admission Deadlines"
      className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 pt-2 pb-4 sm:pb-6"
    >
      <UniversityDeadlineCarouselTrack
        records={activePublishedDeadlines}
        nowMs={nowMs}
        interactiveLinks={true}
        isNight={isNight}
      />
    </section>
  );
};
