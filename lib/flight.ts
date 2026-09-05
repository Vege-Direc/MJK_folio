/**
 * Programmatic scrolling, with a duration and an easing this site chooses.
 *
 * Everything here exists because of one measurement. A cold flight from the hero to
 * contact — 7200px — took 1410ms under `scrollIntoView({ behavior: 'smooth' })` with a
 * 95th-percentile frame gap of 86ms, and one step in the middle of it moved 5,441px in
 * 335ms. A screenshot taken mid-flight showed 490px of a 900px viewport painted flat
 * black: the page was travelling faster than it could raster, so the visitor watched the
 * site tear rather than travel. Desktop measured *worse* than a 4x-throttled phone,
 * because the halo trim in `globals.css` was keyed on `pointer: coarse` and desktop
 * never got it.
 *
 * The order of the two fixes matters and is not interchangeable. The same tween below,
 * without the halo trim, measures p95 82ms — practically the native number. The tween is
 * what makes the flight controlled; the trim is what makes it smooth. Ship one without
 * the other and the work is wasted.
 *
 * What is deliberately NOT claimed here: that this defeats scrolljacking. Native smooth
 * scrolling is already interruptible — that was checked, not assumed. This is not
 * rescuing the visitor from a hijacked page. It is choosing a duration and a curve,
 * which the native API does not expose, and cutting the raster cost while it runs.
 */

/** Shared with every other caller that has to respect the preference. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Distance-proportional, and clamped at both ends.
 *
 * A fixed duration is wrong in both directions: 800ms to cross one stop is syrup, and
 * 340ms to cross eight is the tear described above. The slope is gentle — travelling
 * eight times as far takes about 2.2x as long, not 8x — because the visitor is waiting
 * on an answer at the far end and a literal reading of the distance would make the
 * longest, most impatient flight the slowest one.
 */
function duration(distance: number, viewport: number): number {
  return Math.min(820, Math.max(340, 300 + 70 * (distance / Math.max(viewport, 1))));
}

/**
 * CSS's own `ease-in-out` — cubic-bezier(.42, 0, .58, 1) — for every flight, short or
 * long. `easeOutExpo` used to run the short hops (under 1.5 viewports, the common case):
 * fastest at frame one and decelerating from there, which is the "jumps straight into a
 * fast scroll" MJK flagged. There was never a departure, only an arrival.
 *
 * Picked over easeInOutCubic and easeInOutQuart by peak scroll velocity in px/frame at
 * 60fps, on the two ends of what this file actually flies (9 stops, so 8 hops): a
 * one-stop hop (844px over 370ms, `duration()`'s number for that distance) and an
 * eight-stop flight (7,821px over 820ms, the clamp). Threshold is the ~1-viewport-per-
 * 100ms rate this file's header already ties to visible tearing — ≈141px/frame at an
 * 844px (390×844) viewport:
 *
 *   easeOutExpo    (old, short hops)   226 px/frame (one-stop)   1,028 px/frame (eight-stop)
 *   easeInOutExpo  (old, long flights) 207 px/frame (one-stop)   1,025 px/frame (eight-stop)
 *   easeInOutCubic                     106 px/frame (one-stop)     467 px/frame (eight-stop)
 *   easeInOutQuart                     136 px/frame (one-stop)     616 px/frame (eight-stop)
 *   cubic-bezier(.42,0,.58,1)           65 px/frame (one-stop)     274 px/frame (eight-stop)
 *
 * The bezier has the smallest peak at both distances — comfortably under threshold on
 * the one-stop hop that is the common case (the old curves were both already over it
 * there), and 3.7x gentler than the old far-flight curve on the eight-stop one. It still
 * clears threshold on the eight-stop flight, because 820ms is not enough time to move
 * 7,800px that slowly — that is `duration()`'s clamp, which this change does not touch.
 *
 * Implementation note: this bezier's control points have y1=0 and y2=1, which collapses
 * its y-mapping to the plain smoothstep polynomial 3s²−2s³ — only x needs solving, which
 * `s` does by Newton-Raphson (4 steps measures <2e-9 off a reference bisection solver
 * across the full [0,1] domain, and `d` never approaches zero on this curve's control
 * points, so no divide-by-zero guard is needed).
 */
function ease(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let s = t;
  for (let i = 0; i < 4; i++) {
    const xEst = ((0.52 * s - 0.78) * s + 1.26) * s - t;
    const d = (1.56 * s - 1.56) * s + 1.26;
    s -= xEst / d;
  }
  return (-2 * s + 3) * s * s;
}

let active: number | null = null;
let detach: (() => void) | null = null;

/** Ends the current flight, leaving the page wherever it has reached. */
export function cancelFlight(): void {
  if (active !== null) cancelAnimationFrame(active);
  active = null;
  detach?.();
  detach = null;
  document.documentElement.removeAttribute('data-flying');
}

/**
 * Scroll the page so `top` is at the top of the viewport.
 *
 * `behavior: 'instant'` on every write is load-bearing, not defensive. `html` carries
 * `scroll-behavior: smooth` for in-page anchors, and that declaration re-smooths a bare
 * `scrollTo` — measured going 0 → 16 → 500 over 750ms when the caller had asked for an
 * immediate jump. A tween whose every frame is itself being tweened by the browser is
 * not a tween.
 */
export function flyTo(top: number, onArrive?: () => void): void {
  cancelFlight();

  const target = Math.max(0, Math.min(top, document.documentElement.scrollHeight - window.innerHeight));
  const from = window.scrollY;
  const delta = target - from;

  if (prefersReducedMotion() || Math.abs(delta) < 2) {
    window.scrollTo({ top: target, behavior: 'instant' });
    onArrive?.();
    return;
  }

  const vh = window.innerHeight;
  const ms = duration(Math.abs(delta), vh);
  const started = performance.now();

  // The halo is a stack of Gaussian blurs on every glyph, and it is the whole raster
  // cost of a moving page. `data-flying` swaps in the trimmed set that phones already
  // use, for the length of the flight only, and costs nothing at rest.
  document.documentElement.setAttribute('data-flying', '');

  // A flight is a suggestion. The moment the visitor touches the page it is over, and
  // they keep whatever position they have reached — no snap-back, no fight for control.
  const stop = () => cancelFlight();
  const opts = { passive: true, once: true } as const;
  window.addEventListener('wheel', stop, opts);
  window.addEventListener('touchstart', stop, opts);
  window.addEventListener('keydown', stop, { once: true });
  detach = () => {
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', stop);
  };

  const step = (now: number) => {
    const t = Math.min(1, (now - started) / ms);
    window.scrollTo({ top: from + delta * ease(t), behavior: 'instant' });
    if (t < 1) {
      active = requestAnimationFrame(step);
      return;
    }
    cancelFlight();
    onArrive?.();
  };

  active = requestAnimationFrame(step);
}

/** Fly to an element's top edge, honouring its `scroll-margin-top`. */
export function flyToElement(el: Element, onArrive?: () => void): void {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  flyTo(el.getBoundingClientRect().top + window.scrollY - margin, onArrive);
}
