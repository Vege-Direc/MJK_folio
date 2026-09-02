'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * The RD 350, five frames.
 *
 * Ported from `wireCarousel` / `renderCarousel` (reference/preview.html:2208-2248) with
 * its WCAG 2.2 SC 2.2.2 failure fixed. The prototype autoplayed on a 5.2s interval and
 * paused on `mouseenter` — and on nothing else. A keyboard user could not stop it, a
 * touch user could not stop it, `prefers-reduced-motion` was not consulted, and the
 * interval outlived the element it animated. Here autoplay stops for hover, for focus
 * anywhere inside, for a touch, for reduced motion, and for an explicit button that says
 * what it will do; and the timer is cleared on unmount.
 *
 * The five files were PNG-24 named `.jpg` — 4.14 MB of them, all five fetched eagerly by
 * the prototype as both hero and thumbnail, so ten requests for five images. They are
 * `.png` now and go through next/image, which re-encodes and sizes them per breakpoint.
 */

/**
 * Captions are description, not claim. The prototype's third read "tank · 3rd try",
 * which is the "three attempts at the tank" the corpus does not support; and its meta
 * line read "RD350 · 2016–2018", dates the corpus does not give.
 */
const FRAMES = [
  { src: '/media/rd350/1.png', cap: 'profile', w: 780, h: 640 },
  { src: '/media/rd350/3.png', cap: 'tank', w: 560, h: 900 },
  { src: '/media/rd350/2.png', cap: 'front · lamp', w: 560, h: 800 },
  { src: '/media/rd350/4.png', cap: 'rear · cowl', w: 620, h: 900 },
  { src: '/media/rd350/5.png', cap: 'rider view', w: 560, h: 900 },
] as const;

const INTERVAL_MS = 5200;

/** The media column is 42vw on desktop and the full column below 900px. */
const HERO_SIZES = '(max-width: 900px) 86vw, 42vw';
const THUMB_SIZES = '(max-width: 900px) 17vw, 9vw';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The OS setting, read as an external store rather than mirrored into state.
 *
 * A `useEffect` that calls `setReduced(mql.matches)` on mount is the obvious version and
 * the wrong one: it renders once with the wrong answer, then again with the right one,
 * and React's lint rule says so. `useSyncExternalStore` reads the live value during
 * render and re-renders only when it actually changes. The third argument is the server
 * snapshot: there is no media query during SSR, and `false` there means the markup
 * matches what a reader with motion enabled gets.
 */
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMotion(onChange: () => void): () => void {
  const mql = window.matchMedia(MOTION_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export default function Carousel() {
  const reduced = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
  const [index, setIndex] = useState(0);
  // The frame being faded over. Held for one transition so the incoming photograph has
  // something at full strength underneath it instead of the empty frame.
  const [prev, setPrev] = useState<number | null>(null);

  /** Move to a frame, remembering the one it replaces so the two can cross-fade. */
  const goTo = (next: number | ((i: number) => number)) =>
    setIndex((i) => {
      const to = typeof next === 'function' ? next(i) : next;
      if (to !== i) setPrev(i);
      return to;
    });
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const advancing = playing && !held && !reduced;

  useEffect(() => {
    if (!advancing) return;
    timer.current = setInterval(() => goTo((i) => (i + 1) % FRAMES.length), INTERVAL_MS);
    // The cleanup is the fix: the prototype's interval survived teardown and kept firing
    // against detached nodes.
    return () => clearInterval(timer.current);
  }, [advancing]);

  const step = useCallback((delta: number) => {
    goTo((i) => (i + delta + FRAMES.length) % FRAMES.length);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  };

  return (
    <div
      className="carousel"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
      onTouchStart={() => setPlaying(false)}
    >
      <div className="carousel-hero">
        {FRAMES.map((f, i) => (
          <Image
            key={f.src}
            src={f.src}
            alt={`Yamaha RD 350 cafe racer — ${f.cap}`}
            width={f.w}
            height={f.h}
            sizes={HERO_SIZES}
            // Only the first frame is on screen at load; the rest cross-fade in later.
            priority={i === 0}
            loading={i === 0 ? undefined : 'lazy'}
            className={i === index ? 'on' : i === prev ? 'prev' : undefined}
          />
        ))}
        {/* Announced, not just drawn: the prototype wrote this text with no live region. */}
        <span className="carousel-cap" aria-live="polite">
          {pad(index + 1)} · {FRAMES[index].cap}
        </span>
      </div>

      <div className="carousel-strip" role="tablist" aria-label="RD 350 frames" onKeyDown={onKeyDown}>
        {FRAMES.map((f, i) => (
          <button
            key={f.src}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Frame ${i + 1}: ${f.cap}`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => goTo(i)}
          >
            <Image src={f.src} alt="" width={f.w} height={f.h} sizes={THUMB_SIZES} loading="lazy" />
          </button>
        ))}
      </div>

      <div className="carousel-meta">
        <span>
          <span className="cur">{pad(index + 1)}</span> / <span className="tot">{pad(FRAMES.length)}</span>
        </span>
        <span>RD 350 · CAFE RACER</span>
        <button
          type="button"
          className="carousel-toggle"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause the slideshow' : 'Play the slideshow'}
        >
          {playing ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
      </div>
    </div>
  );
}
