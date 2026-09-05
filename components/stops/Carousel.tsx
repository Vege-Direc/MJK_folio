'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import BeforeAfter, { COMPARE_H, COMPARE_W } from './BeforeAfter';

/**
 * The RD 350 gallery.
 *
 * Ported from `wireCarousel` / `renderCarousel` (reference/preview.html:2208-2248) with
 * its WCAG 2.2 SC 2.2.2 failure fixed. The prototype autoplayed on a 5.2s interval and
 * paused on `mouseenter` — and on nothing else. A keyboard user could not stop it, a
 * touch user could not stop it, `prefers-reduced-motion` was not consulted, and the
 * interval outlived the element it animated. Here autoplay stops for hover, for focus
 * anywhere inside, for a touch, for reduced motion, and for an explicit button that says
 * what it will do; and the timer is cleared on unmount.
 *
 * It also no longer starts itself. The first frame is now a before-and-after wipe with a
 * slider in it, and a slideshow that pulls an interactive control out from under the
 * hand operating it is indefensible whatever the pause button says. Nothing on this stop
 * moves until a visitor asks it to, which is a stronger reading of SC 2.2.2 than the one
 * the button was written to satisfy — the button stays, and now offers the motion rather
 * than apologising for it.
 *
 * The five photographs were PNG-24 named `.jpg` — 4.14 MB of them, all five fetched
 * eagerly by the prototype as both hero and thumbnail, so ten requests for five images.
 * They are `.png` now and go through next/image, which re-encodes and sizes them per
 * breakpoint.
 */

/**
 * Captions are description, not claim. The prototype's third read "tank · 3rd try",
 * which is the "three attempts at the tank" the corpus does not support; and its meta
 * line read "RD350 · 2016–2018", dates the corpus does not give.
 */
type Frame =
  | { readonly kind: 'compare'; readonly cap: string }
  | {
      readonly kind: 'photo';
      readonly src: string;
      readonly alt: string;
      readonly cap: string;
      readonly w: number;
      readonly h: number;
      /**
       * Where the 4:3 window sits on a portrait photograph, as `object-position`'s own
       * percentage. Omitted means the file already fits and nothing is being chosen.
       */
      readonly pos?: string;
    };

const FRAMES = [
  { kind: 'compare', cap: 'before · after' },
  {
    kind: 'photo',
    src: '/media/rd350/3.png',
    alt: 'The finished bike from in front, looking back along the tank: a silver tank with a chrome filler cap and a scalloped knee cutout, the front wheel and fork beside it, and the finned engine below.',
    cap: 'tank',
    w: 560,
    h: 900,
    // 560x900 in a 4:3 box shows 46.6% of the file. The subject runs from the clip-ons at
    // 5% to the engine at 70%, so the window is centred on 37% rather than on the floor.
    pos: '26%',
  },
  {
    kind: 'photo',
    src: '/media/rd350/2.png',
    /*
     * These alt strings describe the CROP, not the file.
     *
     * The hero is `object-fit: cover` in a 4:3 box and these are portrait photographs, so
     * about half of each file is off screen. An alt that describes the whole file tells a
     * screen-reader user about things no sighted reader can see - this one used to end
     * "and the disc-braked front wheel on a garage floor", which the window cuts.
     */
    alt: 'The front end close up: a chrome headlight bowl on the left, black fork tubes with polished lower legs, an amber indicator, and the silver tank and exhaust behind them.',
    cap: 'front · lamp',
    w: 560,
    h: 800,
    // The shallowest of the four at 0.700, so 52.5% survives. Lower than the old global
    // 20% because the lamp this frame is named for sits at 28-50% and the wheel below it
    // is half the alt text.
    pos: '35%',
  },
  {
    kind: 'photo',
    src: '/media/rd350/4.png',
    alt: 'The bike from directly behind: the humped seat cowl with its black centre stripe, the rear tyre between two chrome exhausts, and the rear shock spring.',
    cap: 'rear · cowl',
    w: 620,
    h: 900,
    // The exhaust tips are at 65-73% and the caption is "rear · cowl": at the old global 20%
    // the window ended at 61.4% and cut both of them off, on the frame whose alt text reads
    // "the rear tyre between two chrome exhausts". 27% was my first answer and a screenshot
    // showed the tips still below the frame - the window is [0.483p, 0.483p + 0.517] of the
    // file, so 27% ends at 64.7% and 40% ends at 71%, which is where they are.
    pos: '40%',
  },
  {
    kind: 'photo',
    src: '/media/rd350/5.png',
    alt: 'The view from the saddle: the tank running away with its black centre stripe and chrome filler cap, and one round instrument in a chrome cup between the black clip-on bars.',
    cap: 'rider view',
    w: 560,
    h: 900,
    // The one frame that is vertical end to end - tank at 12%, instrument at 50%, headlight
    // bowl at 95% - so no 4:3 window holds all of it. 40% is the rider's own view: the tank
    // running away, the filler cap, the instrument in its chrome cup, the top of the lamp.
    pos: '40%',
  },
  {
    kind: 'photo',
    src: '/media/rd350/before-engine.jpg',
    alt: 'The engine before the rebuild: cylinder barrels grey with corrosion, paint flaking off the black crankcase cover, rust on the frame tube and grime packed into every cooling fin.',
    cap: 'before · engine',
    w: 900,
    h: 672,
  },
] as const satisfies readonly Frame[];

const INTERVAL_MS = 5200;

/** The media column is 42vw on desktop and the full column below 900px. */
const HERO_SIZES = '(max-width: 900px) 86vw, 42vw';
const THUMB_SIZES = '(max-width: 900px) 15vw, 8vw';

/**
 * `FRAMES` is `as const`, so each entry narrows to its own literal type and the two frames
 * that need no crop have no `pos` property at all to read. `in` is the narrowing that TypeScript
 * accepts here, and it keeps the optional field genuinely optional rather than making every
 * frame declare `pos: undefined`.
 */
function cropOf(f: (typeof FRAMES)[number]): { objectPosition: string } | undefined {
  return 'pos' in f && f.pos ? { objectPosition: `center ${f.pos}` } : undefined;
}

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

/** Same reasoning as `subscribeToMotion`: the tab's visibility is OS/browser state, not
 * component state, so it is read the same way rather than mirrored into a `useEffect`. */
function subscribeToPageVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

export default function Carousel() {
  const reduced = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
  const pageVisible = useSyncExternalStore(
    subscribeToPageVisibility,
    () => !document.hidden,
    () => true,
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
  const [playing, setPlaying] = useState(false);
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  // Starts false: nothing observed this element yet, and the alternative -- assuming it
  // is on screen until told otherwise -- is exactly the bug this gates. A nine-screen
  // page had this timer, and the repaint it drives, running from page load whether or
  // not the stop was anywhere near the viewport.
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    // 0.5 rather than the default (any overlap at all, including one pixel): a sliver of
    // the carousel scrolled into view is not "looking at it".
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.5,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const advancing = playing && !held && !reduced && inView && pageVisible;

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

  /*
   * Hold the slideshow while the visitor is looking at a frame or navigating the strip —
   * and NOWHERE ELSE. This used to live on the root, which is why MJK reported that "play
   * button under motorcycle images doesn't work".
   *
   * The mechanism: `advancing` requires `!held`, and the root's `onPointerEnter` and
   * `onFocusCapture` both set `held`. To press the play control you must move the pointer
   * into the carousel and give the button focus, so the very act of pressing play
   * guaranteed `held` was true. The label flipped to PAUSE and nothing moved. The only way
   * to make it advance was to press play and then take the pointer entirely off the
   * carousel without tabbing anywhere inside it, which nobody would discover.
   *
   * So the courtesy pause is attached to the picture and the thumbnail strip, and the
   * control that turns the slideshow on sits outside both. Hovering the photographs still
   * pauses it, which is the behaviour that was wanted; pressing play now starts it.
   */
  const pause = {
    onPointerEnter: () => setHeld(true),
    onPointerLeave: () => setHeld(false),
    onFocusCapture: () => setHeld(true),
    onBlurCapture: (e: React.FocusEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
    },
  };

  return (
    <div ref={rootRef} className="carousel">
      <div
        className="carousel-hero"
        {...pause}
        // A touch on the photograph is someone examining it, so it stops the slideshow
        // outright rather than merely holding it. On the control below, a touch is the
        // opposite instruction, which is the other half of why this cannot live on the root.
        onTouchStart={() => setPlaying(false)}
      >
        {FRAMES.map((f, i) => {
          const state = i === index ? 'on' : i === prev ? 'prev' : undefined;
          const cls = state ? `carousel-frame ${state}` : 'carousel-frame';
          return f.kind === 'compare' ? (
            <BeforeAfter key="compare" className={cls} />
          ) : (
            <Image
              key={f.src}
              src={f.src}
              alt={f.alt}
              width={f.w}
              height={f.h}
              sizes={HERO_SIZES}
              // Only the first frame is on screen at load; the rest cross-fade in later.
              loading="lazy"
              className={cls}
              /*
               * The crop, chosen per photograph rather than once for all five.
               *
               * `.carousel-frame` is `object-fit: cover` in a 4:3 box, and three of these
               * files are portrait - 560x900 and 620x900 - so between 46.6% and 52.5% of
               * them reaches the screen and the browser picks which half. One global
               * `object-position: center 20%` was picking it for five different
               * compositions at once, and it was picking wrong twice: it cut both exhaust
               * tips off the frame captioned "rear · cowl", and the headlight off the one
               * captioned "rider view". Each frame states its own now, and the reasoning
               * is beside the number in FRAMES.
               */
              style={cropOf(f)}
            />
          );
        })}
        {/* Announced, not just drawn: the prototype wrote this text with no live region. */}
        <span className="carousel-cap" aria-live="polite">
          {pad(index + 1)} · {FRAMES[index].cap}
        </span>
      </div>

      <div className="carousel-strip" role="tablist" aria-label="RD 350 frames" onKeyDown={onKeyDown} {...pause}>
        {FRAMES.map((f, i) => (
          <button
            key={f.kind === 'compare' ? 'compare' : f.src}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Frame ${i + 1}: ${f.cap}`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => goTo(i)}
          >
            {f.kind === 'compare' ? (
              // The thumbnail says what the frame is: the stock half on the left, the
              // rebuilt half on the right, split where the wipe starts.
              <span className="carousel-thumb-split">
                <Image
                  src="/media/rd350/compare-before.jpg"
                  alt=""
                  width={COMPARE_W}
                  height={COMPARE_H}
                  sizes={THUMB_SIZES}
                  loading="lazy"
                />
                <Image
                  src="/media/rd350/compare-after.jpg"
                  alt=""
                  width={COMPARE_W}
                  height={COMPARE_H}
                  sizes={THUMB_SIZES}
                  loading="lazy"
                />
              </span>
            ) : (
              <Image src={f.src} alt="" width={f.w} height={f.h} sizes={THUMB_SIZES} loading="lazy" />
            )}
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
