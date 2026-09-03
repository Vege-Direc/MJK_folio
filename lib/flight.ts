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

/** Under this many viewports of travel, the flight decelerates into the stop. */
const NEAR = 1.5;

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
 * Expo, out for short hops and in-out for long ones.
 *
 * `easeOutExpo` over a short distance puts the deceleration where the eye needs it: the
 * stop arrives and settles. Over 7200px the same curve covers 58% of the journey in the
 * first 100ms, which rips the current stop off the screen before the visitor has
 * registered that anything is moving. Long flights get a symmetric curve so departure
 * reads as departure.
 */
function ease(t: number, far: boolean): number {
  if (t >= 1) return 1;
  if (!far) return 1 - Math.pow(2, -10 * t);
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
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
  const far = Math.abs(delta) > NEAR * vh;
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
    window.scrollTo({ top: from + delta * ease(t, far), behavior: 'instant' });
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
