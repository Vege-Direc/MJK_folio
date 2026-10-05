'use client';

import { useEffect } from 'react';

/**
 * Bring a keyboard-focused control into view when the browser will not.
 *
 * Measured on the live site: the first meaningful Tab stop sat at document top 5114px
 * with `window.scrollY` still 0, immediately and 250ms later. A sighted keyboard visitor
 * tabbed into a control they could not see, with nothing on screen to say anything had
 * happened.
 *
 * The cause is `.panel { overflow: hidden }`. Each stop is a scroll container, so the
 * browser's scroll-into-view walk finds the panel first, scrolls *it* — a panel that has
 * nowhere to go — and stops there rather than chaining out to the document.
 *
 * `scroll-margin-block` in globals.css handles the elements the browser does reach.
 * This handles the ones it does not. Both were tried before this: `overflow: clip` is
 * the fix the audit proposed, on the theory that a non-scroll-container cannot absorb
 * the scroll, and measuring it made things considerably worse — 15 of 16 Tab stops
 * off-screen against 5 of 16 with `hidden`. So the panel keeps `hidden` and this fills
 * the gap.
 *
 * Only for keyboard focus. `:focus-visible` is exactly the "the browser thinks this
 * person is navigating by keyboard" signal, and honouring it means a mouse click never
 * yanks the page around. Reduced motion gets the jump rather than the glide.
 */
export default function FocusIntoView() {
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (!el.matches(':focus-visible')) return;

      const rect = el.getBoundingClientRect();
      // The dock is fixed over the foot of the viewport, so "visible" stops short of it.
      const dock = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dock-h'), 10);
      const floor = window.innerHeight - (Number.isFinite(dock) ? dock : 0) - 16;
      if (rect.top >= 16 && rect.bottom <= floor) return;

      el.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
    };

    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  return null;
}
