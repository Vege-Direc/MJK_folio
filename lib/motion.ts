/**
 * Whether the scene is allowed to move, as one value two places can read.
 *
 * WHY THIS EXISTS AT ALL. `prefers-reduced-motion` is an operating-system setting and this
 * site has honoured it since the scene was written — measured, and real: pixel change per
 * frame goes 7.88% to 0.01% on a desktop and 1.16% to 0.00% on a phone. But WCAG 2.2.2
 * Pause, Stop, Hide is a **Level A** criterion, it reaches decorative content through
 * Conformance Requirement 5.2.5 Non-Interference, it has no decorative exception, and its
 * sufficient technique is a control *in the page*. The media query satisfies 2.3.3, which
 * is AAA. So the site held the harder criterion and missed the mandatory one, and a
 * visitor who finds the field too much had nowhere to say so without leaving to change an
 * OS preference.
 *
 * WHAT IT DOES NOT COVER, DELIBERATELY. 2.2.2 is about content that starts automatically,
 * lasts more than five seconds and runs beside other content. On this page that is the
 * three.js scene and nothing else: every DOM transition here is short and begins because
 * the visitor did something — a 320ms suggestion fade, a height collapse when an answer
 * lands. Those stay on the media query, where they belong. `data-motion` is published on
 * `<html>` anyway, so the state is inspectable and a future rule can hook it without this
 * module changing.
 *
 * WHY A STORE AND NOT A useState. Two things need the answer and they were about to
 * disagree: `MindCanvas` seeds the scene with the OS value at construction and re-applies
 * it whenever the OS changes, and the control writes the visitor's own choice. Without one
 * resolver, a visitor who turned motion back ON would have it turned off again the next
 * time the OS setting changed under them. The precedence is written once, here: an
 * explicit choice outranks the operating system, and the operating system is the default
 * until there is one.
 */

const KEY = 'mjk:motion';

export type MotionPref = 'full' | 'calm';

const listeners = new Set<() => void>();

/** The OS setting, or `full` where there is no `window` to ask. */
function osPref(): MotionPref {
  if (typeof window === 'undefined') return 'full';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full';
}

/**
 * The visitor's own choice, if they have made one.
 *
 * Wrapped, because `localStorage` throws rather than returning null in a Safari private
 * window and under some enterprise policies, and a page that cannot read a preference
 * should fall back to the OS rather than fail to render its dock.
 */
function stored(): MotionPref | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'calm' || v === 'full' ? v : null;
  } catch {
    return null;
  }
}

/** The effective preference: an explicit choice, else the operating system. */
export function motionPref(): MotionPref {
  return stored() ?? osPref();
}

/** Whether the scene should hold still. The form `createMind` and `setReducedMotion` want. */
export function motionReduced(): boolean {
  return motionPref() === 'calm';
}

export function setMotionPref(pref: MotionPref): void {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Nothing to do and nothing worth saying: the choice still applies for this page view,
    // because the notify below is what the UI and the scene actually read.
  }
  for (const cb of [...listeners]) cb();
}

/**
 * `useSyncExternalStore`'s subscribe.
 *
 * Three sources, and all three matter. Our own writes; the OS setting changing while the
 * page is open, which is the case the media query already handled; and `storage`, so the
 * choice follows the visitor across two tabs of the same site rather than leaving one of
 * them contradicting the other.
 */
export function subscribeMotion(cb: () => void): () => void {
  listeners.add(cb);
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  mq.addEventListener('change', cb);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener('change', cb);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * The server snapshot, and it has to be `full`.
 *
 * A server has no operating system preference to report and no `localStorage` to read, so
 * any other answer would be a guess. `full` is also the value that matches the markup the
 * server sends, and the first client render corrects it — which is precisely the exchange
 * `useSyncExternalStore` exists to make safe.
 */
export const SERVER_MOTION: MotionPref = 'full';
