import React, { useEffect, useId, useRef, useState } from 'react';
import {
  OFFICIAL_EVERYKR_ALT,
  OFFICIAL_EVERYKR_LOGO,
} from '../../constants/brandAssets';
import {
  EVERYKR_BRAND_LAYERS,
  EVERYKR_FLIGHT_PATH,
  EVERYKR_MORPH,
} from './everykrLogoData';

export type EveryKrLogoVariant = 'full' | 'homepage' | 'compact' | 'static';

export interface EveryKrAnimatedLogoProps {
  /**
   * - 'full': Full official animated sequence (E morph, orbiting study icons, airplane tear, wordmark & tagline)
   * - 'homepage': Signature entrance reveal (E settle, EVERYKR sweep, airplane tear & swoosh, tagline) + subtle idle motion
   * - 'compact': Fast airplane swoosh & wordmark settle for Auth, Dashboards, Admin, and Loading screens
   * - 'static': Immediately settled official logo with subtle periodic gloss sweep & hover (zero heavy intro)
   */
  variant?: EveryKrLogoVariant;
  /** Responsive height class (e.g., 'h-7 sm:h-9'). Aspect ratio is strictly preserved. */
  imgClassName?: string;
  /** Optional wrapper class */
  className?: string;
  /**
   * Optional dark/night theme override.
   * When omitted, automatically syncs with `document.documentElement.classList.contains('dark')`.
   */
  isNight?: boolean;
  /** Disable idle airplane hover and periodic gloss sweep (renders crisp static SVG) */
  disableIdleAnimation?: boolean;
  /** Optional callback when intro animation settles */
  onAnimationComplete?: () => void;
}

const SESSION_SPLASH_KEY = 'everykr_official_logo_splash_v2';

// Geometry constants preserved verbatim from the official uploaded animated logo
const EC = { x: 272, y: 249 };
const CARD = { x: 855, y: 218 };
const PIVOT = { x: 437, y: 80 };
const TAIL = { x: 460, y: 78 };
const BIG = 1.22;
const SLOTS: [number, number][] = [
  [-560, -145],
  [-680, 0],
  [-540, 145],
  [560, -145],
  [680, 0],
  [540, 145],
];
const ICON_SCALE = 3.0;
const T0 = 4.9;
const T1 = 7.3;
const SETTLED_T = 8.7;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);
const easeInOutQuint = (x: number) =>
  x < 0.5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const easeBack = (x: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function buildMorphPath(kind: 'up' | 'low', m: number): string {
  const A = EVERYKR_MORPH[kind].from;
  const B = EVERYKR_MORPH[kind].to;
  let d = '';
  for (let i = 0; i < A.length; i++) {
    const x = A[i][0] + (B[i][0] - A[i][0]) * m;
    const y = A[i][1] + (B[i][1] - A[i][1]) * m;
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d + 'Z';
}

const SPARK_META = Array.from({ length: 22 }, (_, i) => ({
  fill: ['#ffb23d', '#ff6a3d', '#e6264f', '#ffffff'][i % 4],
  at: (i + 0.5) / 22,
  side: i % 2 ? 1 : -1,
  spread: (((i * 37) % 11) - 5) * 0.12,
  sp: 40 + ((i * 53) % 7) * 10,
  r: 3 + (i % 4) * 1.5,
}));

const VAPOR_META = Array.from({ length: 46 }, (_, i) => ({
  fill: i % 3 ? '#c7d5ff' : '#e3d4ff',
  at: (i + 0.5) / 46,
  side: i % 2 ? 1 : -1,
  drift: 10 + ((i * 29) % 9) * 3,
}));

/**
 * Checks if the user has requested reduced motion at the OS/browser level.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return reduced;
}

/**
 * Tracks global dark mode (`<html class="dark">`) whenever `isNight` prop is not explicitly forced.
 */
function useResolvedDarkTheme(explicitIsNight?: boolean): boolean {
  const [docDark, setDocDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (typeof explicitIsNight === 'boolean' || typeof document === 'undefined') return;
    const root = document.documentElement;
    const sync = () => setDocDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [explicitIsNight]);

  return typeof explicitIsNight === 'boolean' ? explicitIsNight : docDark;
}

/**
 * Official EveryKR Animated Brand Logo Component.
 *
 * Extracted directly from the official `everykr-logo-animated.html` brand identity:
 * - Preserves exact original SVG geometry, artwork layers, blue/purple gradients,
 *   magenta swoosh, airplane flight path, typography, and tagline.
 * - Renders cleanly on a 100% transparent background (no white card, border, or page chrome).
 * - Scopes all SVG `<defs>` IDs via `useId()` so multiple instances never collide.
 * - Pauses off-screen RAF via IntersectionObserver and respects `prefers-reduced-motion`.
 * - Maintains full legibility in both Day Mode and Night Mode without altering brand colors.
 */
export const EveryKrAnimatedLogo: React.FC<EveryKrAnimatedLogoProps> = ({
  variant = 'static',
  imgClassName = 'h-8 sm:h-10',
  className = '',
  isNight,
  disableIdleAnimation = false,
  onAnimationComplete,
}) => {
  const rawUid = useId().replace(/:/g, '');
  const id = (name: string) => `ekr-${name}-${rawUid}`;

  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedNight = useResolvedDarkTheme(isNight);
  const [assetFallback, setAssetFallback] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<SVGPathElement>(null);
  const swRevealRef = useRef<SVGPathElement>(null);
  const eGroupRef = useRef<SVGGElement>(null);
  const realERef = useRef<SVGGElement>(null);
  const vecERef = useRef<SVGGElement>(null);
  const eUpRef = useRef<SVGImageElement>(null);
  const eLowRef = useRef<SVGImageElement>(null);
  const mUpRef = useRef<SVGPathElement>(null);
  const mLowRef = useRef<SVGPathElement>(null);
  const mUpHiRef = useRef<SVGPathElement>(null);
  const mLowHiRef = useRef<SVGPathElement>(null);
  const crackRef = useRef<SVGPathElement>(null);
  const wordRef = useRef<SVGGElement>(null);
  const wordBlurRef = useRef<SVGImageElement>(null);
  const wordSharpRef = useRef<SVGImageElement>(null);
  const textRectRef = useRef<SVGRectElement>(null);
  const tagRectRef = useRef<SVGRectElement>(null);
  const tagRef = useRef<SVGImageElement>(null);
  const planeRef = useRef<SVGGElement>(null);
  const planeInnerRef = useRef<SVGGElement>(null);
  const haloRef = useRef<SVGCircleElement>(null);
  const waveRef = useRef<SVGCircleElement>(null);
  const wave2Ref = useRef<SVGCircleElement>(null);
  const glintRef = useRef<SVGGElement>(null);
  const sweepRef = useRef<SVGRectElement>(null);

  const iconRefs = useRef<(SVGGElement | null)[]>([]);
  const trailRefs = useRef<(SVGPathElement | null)[]>([]);
  const sparkRefs = useRef<(SVGCircleElement | null)[]>([]);
  const vaporRefs = useRef<(SVGCircleElement | null)[]>([]);

  const manualSweepTriggerRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false);
  const isVisibleRef = useRef<boolean>(true);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    if (assetFallback) return;

    const flight = flightRef.current;
    const swReveal = swRevealRef.current;
    if (!flight || !swReveal) return;

    const LEN = flight.getTotalLength() || 1;
    swReveal.style.strokeDasharray = `${LEN} ${LEN}`;
    if (crackRef.current) {
      crackRef.current.style.strokeDasharray = `60 ${LEN * 2}`;
    }

    // Pre-sample flight trajectory once for zero DOM geometry layout reads during animation
    const NS = 600;
    const PX = new Float32Array(NS + 1);
    const PY = new Float32Array(NS + 1);
    for (let i = 0; i <= NS; i++) {
      const q = flight.getPointAtLength((LEN * i) / NS);
      PX[i] = q.x;
      PY[i] = q.y;
    }

    const ptAt = (L: number) => {
      const f = clamp(L / LEN) * NS;
      const i = Math.min(NS - 1, Math.floor(f));
      const u = f - i;
      return {
        x: PX[i] + (PX[i + 1] - PX[i]) * u,
        y: PY[i] + (PY[i + 1] - PY[i]) * u,
      };
    };

    const angAt = (L: number) => {
      const a = ptAt(Math.max(0, L - 4));
      const b = ptAt(Math.min(LEN, L + 4));
      return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    };

    const END_ANG = angAt(LEN);
    const lenWhere = (fn: (p: { x: number; y: number }) => boolean) => {
      for (let L = 0; L <= LEN; L += 2) {
        if (fn(ptAt(L))) return L;
      }
      return LEN;
    };
    const L_IN = lenWhere((p) => p.y < 330 && p.x > 30);
    const L_OUT = lenWhere((p) => p.x > 430);
    const relaxK = (L: number) => clamp((L - L_OUT) / (LEN - L_OUT + 1));

    const renderFrame = (t: number, nowSec: number) => {
      const E = eGroupRef.current;
      const realE = realERef.current;
      const vecE = vecERef.current;
      const eUp = eUpRef.current;
      const eLowEl = eLowRef.current;
      const mUp = mUpRef.current;
      const mLow = mLowRef.current;
      const mUpHi = mUpHiRef.current;
      const mLowHi = mLowHiRef.current;
      const crack = crackRef.current;
      const word = wordRef.current;
      const wordBlur = wordBlurRef.current;
      const wordSharp = wordSharpRef.current;
      const textRect = textRectRef.current;
      const tagRect = tagRectRef.current;
      const tag = tagRef.current;
      const plane = planeRef.current;
      const planeInner = planeInnerRef.current;
      const halo = haloRef.current;
      const wave = waveRef.current;
      const wave2 = wave2Ref.current;
      const glint = glintRef.current;
      const sweep = sweepRef.current;

      // 1. E icon entry & convergence
      if (E) {
        E.style.opacity = String(easeInOutSine(seg(t, 0, 0.6)));
        const pop = easeBack(seg(t, 0, 0.7));
        const pulse = Math.sin(seg(t, 3.05, 3.45) * Math.PI) * 0.1;
        const settle = easeInOutQuint(seg(t, 3.25, 4.4));
        const s = (0.6 + 0.4 * pop) * (BIG + (1 - BIG) * settle + pulse);
        const cx = EC.x + (CARD.x - EC.x) * (1 - settle);
        const cy = EC.y + (CARD.y - EC.y) * (1 - settle);
        E.setAttribute(
          'transform',
          `translate(${cx} ${cy}) scale(${s}) translate(${-EC.x} ${-EC.y})`
        );
      }

      // 2. Study / Korea icons orbiting and converging into the E
      const conv = easeInOutSine(seg(t, 2.5, 3.3));
      const showOrbit = t >= 0.9 && t < 3.6;
      for (let i = 0; i < SLOTS.length; i++) {
        const ic = iconRefs.current[i];
        const tr = trailRefs.current[i];
        if (ic) {
          if (!showOrbit) {
            ic.setAttribute('opacity', '0');
          } else {
            const a = easeBack(seg(t, 0.9 + i * 0.13, 1.4 + i * 0.13));
            const [ox, oy] = SLOTS[i];
            const bob = Math.sin(t * 2.6 + i * 1.1) * 12 * (1 - conv);
            const x = CARD.x + ox * (1 - conv);
            const y = CARD.y + (oy + bob) * (1 - conv);
            const sc = Math.max(0.001, a * (1 - conv) * ICON_SCALE);
            ic.setAttribute(
              'transform',
              `translate(${x} ${y}) scale(${sc}) rotate(${(1 - a) * -25 + conv * 120})`
            );
            ic.setAttribute('opacity', String(clamp(1 - conv * 1.1)));
          }
        }
        if (tr) {
          if (showOrbit && conv > 0 && conv < 1) {
            const [ox, oy] = SLOTS[i];
            const c0 = easeInOutSine(seg(t - 0.12, 2.5, 3.3));
            const x0 = CARD.x + ox * (1 - c0);
            const y0 = CARD.y + oy * (1 - c0);
            const bob = Math.sin(t * 2.6 + i * 1.1) * 12 * (1 - conv);
            const x = CARD.x + ox * (1 - conv);
            const y = CARD.y + (oy + bob) * (1 - conv);
            tr.setAttribute('d', `M ${x0} ${y0} L ${x} ${y}`);
            tr.setAttribute('stroke-width', String(28 * (1 - conv) + 2));
            tr.setAttribute('opacity', String(0.35 * Math.sin(conv * Math.PI)));
          } else {
            tr.setAttribute('opacity', '0');
          }
        }
      }

      // Impact halo + shockwaves
      const im = seg(t, 3.05, 3.9);
      const im2 = seg(t, 3.2, 4.1);
      if (wave) {
        wave.setAttribute('r', String(120 + 620 * easeOut(im)));
        wave.setAttribute('opacity', String(im > 0 && im < 1 ? 0.65 * (1 - im) : 0));
        wave.setAttribute('stroke-width', String(12 * (1 - im) + 1));
      }
      if (wave2) {
        wave2.setAttribute('r', String(120 + 500 * easeOut(im2)));
        wave2.setAttribute('opacity', String(im2 > 0 && im2 < 1 ? 0.45 * (1 - im2) : 0));
      }
      if (halo) {
        const hl = Math.sin(seg(t, 2.7, 3.8) * Math.PI);
        halo.setAttribute('opacity', String(hl * 0.8));
        halo.setAttribute('r', String(240 + 130 * hl));
      }

      // 3. EVERYKR wordmark sweeps in with motion blur -> crisp focus
      const r = easeOutQuint(seg(t, 3.8, 5.0));
      if (textRect) textRect.setAttribute('width', String(1260 * r));
      if (word) word.setAttribute('transform', `translate(${-90 * (1 - r)} ${14 * (1 - r)})`);
      const sharp = easeInOutSine(seg(t, 4.0, 4.8));
      if (wordSharp) wordSharp.setAttribute('opacity', String(sharp));
      if (wordBlur) wordBlur.setAttribute('opacity', String(1 - sharp));

      // 4. Airplane swoops through, revealing magenta swoosh & morphing E
      const p = easeInOutSine(seg(t, T0, T1));
      const L = Math.max(0.5, p * LEN);
      swReveal.style.strokeDashoffset = String(LEN - (t >= T0 ? L : 0));

      const ro = t < T0 ? 0 : easeInOut(clamp((L - L_OUT * 0.85) / (LEN - L_OUT * 0.85)));
      if (realE) realE.setAttribute('opacity', String(ro));
      if (vecE) vecE.setAttribute('opacity', String(1 - ro));

      // Only recompute morph polygon strings while vecE is visible
      if (1 - ro > 0.001 && mUp && mLow && mUpHi && mLowHi) {
        const mp =
          t < T0 ? 0 : easeInOutSine(clamp((L - L_IN * 0.4) / (L_OUT - L_IN * 0.4)));
        const dUp = buildMorphPath('up', mp);
        const dLow = buildMorphPath('low', mp);
        mUp.setAttribute('d', dUp);
        mLow.setAttribute('d', dLow);
        mUpHi.setAttribute('d', dUp);
        mLowHi.setAttribute('d', dLow);
      }

      if (crack) {
        crack.style.strokeDashoffset = String(-(L - 60));
        crack.setAttribute(
          'opacity',
          t >= T0 && L > L_IN && L < L_OUT + 40 ? '0.9' : '0'
        );
      }

      const tear = clamp((L - L_IN) / (L_OUT - L_IN));
      const kick = t < T0 ? 0 : Math.sin(tear * Math.PI) * (1 - relaxK(L)) * 0.35;
      if (eUp) {
        eUp.setAttribute(
          'transform',
          kick > 0.001
            ? `translate(${-7 * kick} ${-10 * kick}) rotate(${-1.2 * kick} ${PIVOT.x} ${PIVOT.y})`
            : ''
        );
      }
      if (eLowEl) {
        eLowEl.setAttribute(
          'transform',
          kick > 0.001 ? `translate(${4 * kick} ${6 * kick})` : ''
        );
      }

      if (t >= T0) {
        const pt = ptAt(L);
        const ang = angAt(L);
        const sc = 0.55 + 0.45 * easeOut(p);
        const idle = disableIdleAnimation || prefersReducedMotion ? 0 : seg(t, T1 + 0.3, T1 + 1.2);
        const hov = Math.sin((t - T1) * 2.2) * 4.5 * idle;
        if (plane) {
          plane.setAttribute(
            'transform',
            `translate(${pt.x + hov * 0.4} ${pt.y - hov}) rotate(${ang - END_ANG - hov * 0.15}) scale(${sc})`
          );
          plane.setAttribute('opacity', String(clamp(seg(t, T0, T0 + 0.25))));
        }
        if (planeInner) {
          planeInner.setAttribute('transform', `translate(${-TAIL.x} ${-TAIL.y})`);
        }

        // Vapor trail puffs (active during flight + short settle fade)
        const vaporActive = t < T1 + 1.8;
        for (let i = 0; i < VAPOR_META.length; i++) {
          const el = vaporRefs.current[i];
          if (!el) continue;
          if (!vaporActive) {
            el.setAttribute('r', '0');
            continue;
          }
          const v = VAPOR_META[i];
          const born = v.at * LEN;
          const life = (L - born) / 220 + Math.max(0, t - T1) * 0.6;
          if (life <= 0 || life >= 1) {
            el.setAttribute('r', '0');
            continue;
          }
          const o = ptAt(born);
          const a = ((angAt(born) + 90 * v.side) * Math.PI) / 180;
          el.setAttribute('cx', String(o.x + Math.cos(a) * v.drift * easeOut(life)));
          el.setAttribute('cy', String(o.y + Math.sin(a) * v.drift * easeOut(life) - 6 * life));
          el.setAttribute('r', String(3 + 9 * easeOut(life)));
          el.setAttribute('opacity', String(0.32 * (1 - life)));
        }

        // Arrival glint
        if (glint) {
          const gk = seg(t, T1 - 0.15, T1 + 0.7);
          glint.setAttribute('opacity', gk > 0 && gk < 1 ? String(Math.sin(gk * Math.PI)) : '0');
          if (gk > 0 && gk < 1) {
            glint.setAttribute(
              'transform',
              `translate(592 14) rotate(${45 * gk}) scale(${0.2 + 0.5 * Math.sin(gk * Math.PI)})`
            );
          }
        }

        // Sparks when piercing E
        const sparksActive = t < T1 + 0.5;
        for (let i = 0; i < SPARK_META.length; i++) {
          const el = sparkRefs.current[i];
          if (!el) continue;
          if (!sparksActive) {
            el.setAttribute('r', '0');
            continue;
          }
          const sp = SPARK_META[i];
          const born = L_IN + sp.at * (L_OUT - L_IN);
          const life = (L - born) / 160;
          if (life <= 0 || life >= 1) {
            el.setAttribute('r', '0');
            continue;
          }
          const o = ptAt(born);
          const a =
            ((angAt(born) + 90 * sp.side) * Math.PI) / 180 + sp.spread - 0.4 * sp.side;
          const d = sp.sp * easeOut(life);
          el.setAttribute('cx', String(o.x + Math.cos(a) * d));
          el.setAttribute('cy', String(o.y + Math.sin(a) * d));
          el.setAttribute('r', String(sp.r * (1 - life)));
          el.setAttribute('opacity', String(1 - life));
        }
      } else {
        if (plane) plane.setAttribute('opacity', '0');
        if (glint) glint.setAttribute('opacity', '0');
        for (let i = 0; i < SPARK_META.length; i++) sparkRefs.current[i]?.setAttribute('r', '0');
        for (let i = 0; i < VAPOR_META.length; i++) vaporRefs.current[i]?.setAttribute('r', '0');
      }

      // 5. Tagline opens cleanly from center
      const g = easeOut(seg(t, 7.3, 8.1));
      if (tagRect) {
        tagRect.setAttribute('x', String(1077 - 640 * g));
        tagRect.setAttribute('width', String(1280 * g));
      }
      if (tag) tag.setAttribute('opacity', String(g));

      // 6. Periodic diagonal gloss light sweep (every 4.5s once settled, or on pointer hover)
      if (sweep) {
        if (prefersReducedMotion || disableIdleAnimation) {
          sweep.setAttribute('opacity', '0');
        } else {
          let sw = 0;
          if (manualSweepTriggerRef.current !== null) {
            const elapsedHover = nowSec - manualSweepTriggerRef.current;
            if (elapsedHover >= 0 && elapsedHover <= 1.25) {
              sw = elapsedHover / 1.25;
            } else {
              manualSweepTriggerRef.current = null;
            }
          }
          if (sw === 0 && t >= 7.9) {
            const ts = (t - 7.9) % 4.8;
            sw = ts < 1.3 ? ts / 1.3 : 0;
          }
          if (sw > 0 && sw < 1) {
            sweep.setAttribute('x', String(-500 + 2500 * easeInOut(sw)));
            sweep.setAttribute('opacity', '1');
          } else {
            sweep.setAttribute('opacity', '0');
          }
        }
      }
    };

    // Static / reduced-motion fast path: jump directly to crisp settled logo with zero RAF loop
    if (prefersReducedMotion || (variant === 'static' && disableIdleAnimation)) {
      renderFrame(SETTLED_T, 0);
      return;
    }

    // Configure starting timeline position & pacing per variant
    const startOffset =
      variant === 'full'
        ? 0
        : variant === 'homepage'
        ? 3.7
        : variant === 'compact'
        ? 4.85
        : SETTLED_T;

    const introSpeed =
      variant === 'full'
        ? 1.95
        : variant === 'homepage'
        ? 1.35
        : variant === 'compact'
        ? 1.45
        : 1.0;

    completedRef.current = startOffset >= SETTLED_T;

    // Render initial frame synchronously to avoid blank first paint
    renderFrame(startOffset, 0);

    // Pause animation when scrolled off-screen to preserve CPU/battery
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          isVisibleRef.current = entries.some((e) => e.isIntersecting);
        },
        { threshold: 0.01 }
      );
      observer.observe(containerRef.current);
    }

    let rafId = 0;
    let lastTs: number | null = null;
    let simT = startOffset;

    const tick = (ts: number) => {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;

      if (isVisibleRef.current) {
        const rate = simT < SETTLED_T ? introSpeed : 1.0;
        simT += dt * rate;
        renderFrame(simT, ts / 1000);

        if (!completedRef.current && simT >= SETTLED_T) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
      }

      if (!disableIdleAnimation || simT < SETTLED_T) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [variant, prefersReducedMotion, disableIdleAnimation, assetFallback]);

  const handleMouseEnter = () => {
    if (prefersReducedMotion || disableIdleAnimation) return;
    manualSweepTriggerRef.current = performance.now() / 1000;
  };

  if (assetFallback) {
    return (
      <div
        className={`inline-flex items-center select-none shrink-0 max-w-full ${className}`}
        role="img"
        aria-label={OFFICIAL_EVERYKR_ALT}
      >
        <img
          src={OFFICIAL_EVERYKR_LOGO}
          alt={OFFICIAL_EVERYKR_ALT}
          className={`${imgClassName} w-auto max-w-full object-contain block pointer-events-none ${
            resolvedNight
              ? 'drop-shadow-[0_0_1.5px_rgba(232,241,255,0.85)] drop-shadow-[0_0_10px_rgba(147,197,253,0.45)]'
              : ''
          }`}
        />
      </div>
    );
  }

  const nightFilterAttr = resolvedNight ? `url(#${id('nightContrast')})` : undefined;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      className={`relative inline-flex items-center select-none shrink-0 max-w-full overflow-visible bg-transparent ${className}`}
    >
      <svg
        viewBox="0 0 1710 436"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={OFFICIAL_EVERYKR_ALT}
        className={`${imgClassName} w-auto max-w-full block overflow-visible pointer-events-none aspect-[1710/436]`}
        style={{ background: 'transparent' }}
      >
        <defs>
          {/* Subtle contrast-preserving pearlescent backlit rim ONLY for Night Mode dark transparent surfaces.
              Preserves 100% of original RGB logo pixels (SourceGraphic on top) with zero box or card. */}
          <filter
            id={id('nightContrast')}
            x="-12%"
            y="-35%"
            width="124%"
            height="170%"
            colorInterpolationFilters="sRGB"
          >
            <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="dilated" />
            <feGaussianBlur in="dilated" stdDeviation="4.5" result="rimBlur" />
            <feFlood floodColor="#E8F1FF" floodOpacity="0.9" result="rimColor" />
            <feComposite in="rimColor" in2="rimBlur" operator="in" result="crispRim" />
            <feGaussianBlur in="SourceAlpha" stdDeviation="18" result="auraBlur" />
            <feFlood floodColor="#93C5FD" floodOpacity="0.45" result="auraColor" />
            <feComposite in="auraColor" in2="auraBlur" operator="in" result="softAura" />
            <feMerge>
              <feMergeNode in="softAura" />
              <feMergeNode in="crispRim" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id={id('gHalo')}>
            <stop offset="0" stopColor="#3f7bff" stopOpacity=".55" />
            <stop offset="1" stopColor="#3f7bff" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={id('gSweep')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".72" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id={id('gIcon')}
            gradientUnits="userSpaceOnUse"
            x1="-18"
            y1="-12"
            x2="18"
            y2="16"
          >
            <stop offset="0" stopColor="#1f8bff" />
            <stop offset="1" stopColor="#4a1fe0" />
          </linearGradient>

          <radialGradient id={id('gIcoSh')}>
            <stop offset=".6" stopColor="#1a1f5a" stopOpacity=".16" />
            <stop offset="1" stopColor="#1a1f5a" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={id('gGlint')}>
            <stop offset="0" stopColor="#fff" />
            <stop offset=".35" stopColor="#8fb8ff" />
            <stop offset="1" stopColor="#5a7dff" stopOpacity="0" />
          </radialGradient>

          <linearGradient
            id={id('gVecE')}
            gradientUnits="userSpaceOnUse"
            x1="110"
            y1="77"
            x2="470"
            y2="421"
          >
            <stop offset="0" stopColor="#1aa6ff" />
            <stop offset=".35" stopColor="#1f62f2" />
            <stop offset=".7" stopColor="#1c2fd2" />
            <stop offset="1" stopColor="#6b2ff2" />
          </linearGradient>

          <linearGradient
            id={id('gGlossE')}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="77"
            x2="0"
            y2="250"
          >
            <stop offset="0" stopColor="#fff" stopOpacity=".42" />
            <stop offset=".45" stopColor="#fff" stopOpacity=".08" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>

          <clipPath id={id('textClip')}>
            <rect ref={textRectRef} x="470" y="100" width="1260" height="300" />
          </clipPath>

          <clipPath id={id('tagClip')}>
            <rect ref={tagRectRef} x="437" y="360" width="1280" height="80" />
          </clipPath>

          <mask
            id={id('swMask')}
            maskUnits="userSpaceOnUse"
            x="-300"
            y="-300"
            width="2600"
            height="1200"
          >
            <path
              ref={swRevealRef}
              d={EVERYKR_FLIGHT_PATH}
              fill="none"
              stroke="#fff"
              strokeWidth="78"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </mask>

          <mask
            id={id('glossMask')}
            maskUnits="userSpaceOnUse"
            x="-300"
            y="-300"
            width="2600"
            height="1200"
            style={{ maskType: 'alpha' }}
          >
            <image href={EVERYKR_BRAND_LAYERS.eUp} x="106" y="77" width="331" height="150" />
            <image href={EVERYKR_BRAND_LAYERS.eLow} x="84" y="175" width="377" height="246" />
            <image
              href={EVERYKR_BRAND_LAYERS.wordSharp}
              x="510"
              y="143"
              width="1179"
              height="204"
            />
          </mask>
        </defs>

        {/* Impact halo & shockwaves (active only during full intro convergence) */}
        <circle
          ref={haloRef}
          cx={CARD.x}
          cy={CARD.y}
          r="330"
          fill={`url(#${id('gHalo')})`}
          opacity="0"
        />
        <circle
          ref={waveRef}
          cx={CARD.x}
          cy={CARD.y}
          r="120"
          fill="none"
          stroke="#3f7bff"
          strokeWidth="8"
          opacity="0"
        />
        <circle
          ref={wave2Ref}
          cx={CARD.x}
          cy={CARD.y}
          r="120"
          fill="none"
          stroke="#7a4cff"
          strokeWidth="5"
          opacity="0"
        />

        {/* Official E Emblem (exact artwork split along the swoosh) */}
        <g ref={eGroupRef}>
          <g ref={realERef} opacity="1">
            <image
              ref={eUpRef}
              href={EVERYKR_BRAND_LAYERS.eUp}
              x="106"
              y="77"
              width="331"
              height="150"
              onError={() => setAssetFallback(true)}
            />
            <image
              ref={eLowRef}
              href={EVERYKR_BRAND_LAYERS.eLow}
              x="84"
              y="175"
              width="377"
              height="246"
              onError={() => setAssetFallback(true)}
            />
          </g>
          <g ref={vecERef} opacity="0">
            <path ref={mLowRef} fill={`url(#${id('gVecE')})`} />
            <path ref={mUpRef} fill={`url(#${id('gVecE')})`} />
            <path ref={mLowHiRef} fill={`url(#${id('gGlossE')})`} />
            <path ref={mUpHiRef} fill={`url(#${id('gGlossE')})`} />
          </g>
          <path
            ref={crackRef}
            d={EVERYKR_FLIGHT_PATH}
            fill="none"
            stroke="#fff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0"
          />
        </g>

        {/* Official Aerodynamic Magenta-Purple Swoosh */}
        <g mask={`url(#${id('swMask')})`}>
          <image
            href={EVERYKR_BRAND_LAYERS.swooshShadow}
            x="-27"
            y="41"
            width="526"
            height="420"
            opacity=".6"
          />
          <image
            href={EVERYKR_BRAND_LAYERS.swoosh}
            x="13"
            y="81"
            width="446"
            height="340"
          />
        </g>

        {/* Hidden Geometry Reference Path */}
        <path ref={flightRef} d={EVERYKR_FLIGHT_PATH} fill="none" stroke="none" />

        {/* Dynamic Vapor Puffs, Sparks, and Light Trails */}
        <g>
          {VAPOR_META.map((v, i) => (
            <circle
              key={`v-${i}`}
              ref={(el) => {
                vaporRefs.current[i] = el;
              }}
              r="0"
              fill={v.fill}
            />
          ))}
        </g>
        <g>
          {SPARK_META.map((sp, i) => (
            <circle
              key={`s-${i}`}
              ref={(el) => {
                sparkRefs.current[i] = el;
              }}
              r="0"
              fill={sp.fill}
            />
          ))}
        </g>
        <g>
          {SLOTS.map((_, i) => (
            <path
              key={`t-${i}`}
              ref={(el) => {
                trailRefs.current[i] = el;
              }}
              fill="none"
              strokeLinecap="round"
              stroke="#5b8bff"
              opacity="0"
            />
          ))}
        </g>

        {/* Orbiting Study / Korea Icons (Original 6 Icons from Uploaded Logo) */}
        <g>
          {/* 1. Graduation Cap */}
          <g
            ref={(el) => {
              iconRefs.current[0] = el;
            }}
            opacity="0"
          >
            <circle r="36" cy="6" fill={`url(#${id('gIcoSh')})`} />
            <circle r="27" fill="#fff" stroke="#e1e3f2" strokeWidth="2" />
            <path d="M -17 -3 L 0 -11 L 17 -3 L 0 5 Z" fill={`url(#${id('gIcon')})`} />
            <path
              d="M -9 0 L -9 8 Q 0 13 9 8 L 9 0"
              fill="none"
              stroke="#0f1535"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <path d="M 17 -3 L 17 9" stroke="#e6264f" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="17" cy="10" r="2.4" fill="#e6264f" />
          </g>

          {/* 2. Open Book */}
          <g
            ref={(el) => {
              iconRefs.current[1] = el;
            }}
            opacity="0"
          >
            <circle r="36" cy="6" fill={`url(#${id('gIcoSh')})`} />
            <circle r="27" fill="#fff" stroke="#e1e3f2" strokeWidth="2" />
            <path
              d="M 0 -7 Q -9 -12 -17 -9 L -17 11 Q -9 8 0 12 Q 9 8 17 11 L 17 -9 Q 9 -12 0 -7 Z"
              fill="#eef1ff"
              stroke="#0f1535"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M 0 -7 L 0 12" stroke="#0f1535" strokeWidth="2.4" />
            <path
              d="M -12 -3 L -5 -2 M -12 2 L -5 3 M 5 -2 L 12 -3 M 5 3 L 12 2"
              stroke="#4a1fe0"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>

          {/* 3. Pencil */}
          <g
            ref={(el) => {
              iconRefs.current[2] = el;
            }}
            opacity="0"
          >
            <circle r="36" cy="6" fill={`url(#${id('gIcoSh')})`} />
            <circle r="27" fill="#fff" stroke="#e1e3f2" strokeWidth="2" />
            <g transform="rotate(40)">
              <rect
                x="-4.5"
                y="-17"
                width="9"
                height="24"
                rx="1.5"
                fill="#ff8a3d"
                stroke="#0f1535"
                strokeWidth="2.2"
              />
              <path
                d="M -4.5 7 L 0 16 L 4.5 7 Z"
                fill="#f6e3c7"
                stroke="#0f1535"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <rect
                x="-4.5"
                y="-17"
                width="9"
                height="5"
                fill="#e6264f"
                stroke="#0f1535"
                strokeWidth="2.2"
              />
            </g>
          </g>

          {/* 4. Globe */}
          <g
            ref={(el) => {
              iconRefs.current[3] = el;
            }}
            opacity="0"
          >
            <circle r="36" cy="6" fill={`url(#${id('gIcoSh')})`} />
            <circle r="27" fill="#fff" stroke="#e1e3f2" strokeWidth="2" />
            <circle r="14" fill="#eef1ff" stroke="#0f1535" strokeWidth="2.4" />
            <ellipse rx="6" ry="14" fill="none" stroke="#1f6bff" strokeWidth="2" />
            <path
              d="M -14 0 L 14 0 M -12 -7 L 12 -7 M -12 7 L 12 7"
              stroke="#1f6bff"
              strokeWidth="1.8"
            />
          </g>

          {/* 5. Destination Pin */}
          <g
            ref={(el) => {
              iconRefs.current[4] = el;
            }}
            opacity="0"
          >
            <circle r="36" cy="6" fill={`url(#${id('gIcoSh')})`} />
            <circle r="27" fill="#fff" stroke="#e1e3f2" strokeWidth="2" />
            <path d="M 0 16 C -12 3 -12 -13 0 -13 C 12 -13 12 3 0 16 Z" fill="#e6264f" />
            <circle cy="-3" r="4.5" fill="#fff" />
          </g>

          {/* 6. Korean Language Speech Bubble (한) */}
          <g
            ref={(el) => {
              iconRefs.current[5] = el;
            }}
            opacity="0"
          >
            <circle r="36" cy="6" fill={`url(#${id('gIcoSh')})`} />
            <circle r="27" fill="#fff" stroke="#e1e3f2" strokeWidth="2" />
            <path
              d="M -15 -12 L 15 -12 Q 18 -12 18 -9 L 18 7 Q 18 10 15 10 L -2 10 L -9 16 L -8 10 L -15 10 Q -18 10 -18 7 L -18 -9 Q -18 -12 -15 -12 Z"
              fill={`url(#${id('gIcon')})`}
            />
            <text
              y="5"
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="#fff"
              fontFamily="'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif"
            >
              한
            </text>
          </g>
        </g>

        {/* Official EVERYKR Wordmark (Exact Original Artwork) */}
        <g clipPath={`url(#${id('textClip')})`} filter={nightFilterAttr}>
          <g ref={wordRef}>
            <image
              ref={wordBlurRef}
              href={EVERYKR_BRAND_LAYERS.wordBlur}
              x="450"
              y="83"
              width="1299"
              height="324"
              opacity="0"
            />
            <image
              ref={wordSharpRef}
              href={EVERYKR_BRAND_LAYERS.wordSharp}
              x="510"
              y="143"
              width="1179"
              height="204"
              opacity="1"
              onError={() => setAssetFallback(true)}
            />
          </g>
        </g>

        {/* Periodic Diagonal Gloss Light Sweep */}
        <g mask={`url(#${id('glossMask')})`}>
          <rect
            ref={sweepRef}
            x="-500"
            y="-60"
            width="260"
            height="560"
            fill={`url(#${id('gSweep')})`}
            transform="skewX(-20)"
            opacity="0"
          />
        </g>

        {/* Official Tagline: EVERYTHING KOREA, ONE PLATFORM. */}
        <g clipPath={`url(#${id('tagClip')})`} filter={nightFilterAttr}>
          <image
            ref={tagRef}
            href={EVERYKR_BRAND_LAYERS.tagline}
            x="465"
            y="379"
            width="1224"
            height="31.4"
            opacity="1"
          />
        </g>

        {/* Arrival Glint */}
        <g ref={glintRef} opacity="0">
          <circle r="60" fill={`url(#${id('gGlint')})`} opacity=".7" />
          <path d="M 0 -70 Q 5 -5 70 0 Q 5 5 0 70 Q -5 5 -70 0 Q -5 -5 0 -70 Z" fill="#fff" />
          <path
            d="M 0 -70 Q 5 -5 70 0 Q 5 5 0 70 Q -5 5 -70 0 Q -5 -5 0 -70 Z"
            fill="none"
            stroke="#6f9bff"
            strokeWidth="2"
            opacity=".6"
          />
        </g>

        {/* Official Airplane (Exact Original Artwork) */}
        <g ref={planeRef} opacity="1" filter={nightFilterAttr}>
          <g ref={planeInnerRef} transform={`translate(${-TAIL.x} ${-TAIL.y})`}>
            <image
              href={EVERYKR_BRAND_LAYERS.planeShadow}
              x="408"
              y="-28"
              width="215"
              height="170"
              transform="translate(6 22)"
            />
            <image
              href={EVERYKR_BRAND_LAYERS.plane}
              x="448"
              y="12"
              width="135"
              height="90"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

/** Semantic alias for the single official EveryKR logo component */
export const EveryKRLogo = EveryKrAnimatedLogo;

/**
 * Branded Initial Loading / Welcome Splash Screen.
 * Plays the official EveryKR animated logo cleanly on a transparent frosted-glass surface
 * (zero opaque white card or box border), once per session, with instant click/keyboard skip
 * and full `prefers-reduced-motion` support.
 */
export const EveryKrInitialSplashLoader: React.FC = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return false;
    }
    const path = window.location.pathname;
    if (path === '/reset-password' || path === '/__/auth/action') {
      return false;
    }
    try {
      return sessionStorage.getItem(SESSION_SPLASH_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const [fadingOut, setFadingOut] = useState<boolean>(false);

  useEffect(() => {
    if (!visible || prefersReducedMotion) {
      setVisible(false);
      return;
    }

    try {
      sessionStorage.setItem(SESSION_SPLASH_KEY, '1');
    } catch {
      // ignore storage errors
    }

    const fadeTimer = window.setTimeout(() => {
      setFadingOut(true);
    }, 4400);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 4850);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        setFadingOut(true);
        window.setTimeout(() => setVisible(false), 220);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, prefersReducedMotion]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading EveryKR"
      onClick={() => {
        setFadingOut(true);
        window.setTimeout(() => setVisible(false), 220);
      }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F4F8FF]/92 dark:bg-[#050B18]/92 backdrop-blur-2xl transition-opacity duration-450 cursor-pointer px-6 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Ambient Aura */}
      <div className="pointer-events-none absolute w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] rounded-full bg-[radial-gradient(circle,rgba(56,152,255,0.18)_0%,rgba(236,72,153,0.10)_45%,transparent_72%)] blur-2xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-xl">
        <EveryKrAnimatedLogo
          variant="full"
          imgClassName="h-16 sm:h-24 md:h-28"
        />

        {/* Minimalist Aerodynamic Progress Ribbon */}
        <div className="w-48 sm:w-64 h-1 rounded-full bg-slate-300/60 dark:bg-white/15 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#0084FF] via-[#6D28D9] to-[#EC4899] ekr-splash-progress-bar" />
        </div>
      </div>
    </div>
  );
};
