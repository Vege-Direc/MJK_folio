'use client';

import { useEffect, useRef } from 'react';
import { setMind } from '@/lib/mind/controller';
import { STOPS } from '@/content/stops';
import type { MindHandle } from '@/lib/mind/scene';

/**
 * Mounts the scene. Everything expensive happens after the page is already readable.
 *
 * The `<canvas>` is server-rendered — it is inert markup, and having it in the first
 * paint means the dark ground is there from the start rather than flashing in. three.js
 * (~600 KB raw, one cached chunk) and the scene module are imported dynamically from an
 * idle callback, so nine sections of server-rendered prose are interactive first. The
 * scene is ambience; the writing is the page.
 *
 * `next/dynamic({ ssr: false })` would not do: that still ties the chunk to render.
 *
 * When any of it fails — no WebGL, a lost context, an import that 404s — the canvas
 * stays exactly what it already is: a full-viewport rectangle of --color-bg. There is no
 * error state to design because the failure mode is the background.
 */
/**
 * -1 where the stop puts its text on the left, +1 where it puts it on the right.
 * Computed once at module scope: STOPS is a literal and this never changes.
 */
const TEXT_SIDES = STOPS.map((s) => (s.align === 'right' ? 1 : -1));

export default function MindCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    // A type-only import: it erases at compile time and pulls in no chunk.
    let handle: MindHandle | null = null;
    let cancelled = false;
    let idle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box && handle) handle.resize(Math.round(box.width), Math.round(box.height));
    });
    const onVisibility = () => handle?.setPaused(document.hidden);
    const onMotionChange = (e: MediaQueryListEvent) => handle?.setReducedMotion(e.matches);

    /**
     * The chat layer announces a routed answer as `mjk:route` with `{ stopId, index }`
     * and moves the page itself with `scrollIntoView`. The scene answers by firing a
     * signal from that stop's node — light travelling to the place the answer landed.
     *
     * Not `flyTo`: the page scroll is already going there, `ScrollProgress` is already
     * pushing it in, and a camera tween racing the same destination is the fight that
     * put `data-stop` and `data-active` out of step. The scene has one authority over
     * where it is, and it is the document.
     */
    const onRoute = (e: Event) => {
      const detail = (e as CustomEvent<{ stopId?: string; index?: number }>).detail;
      if (typeof detail?.index === 'number') handle?.pulse(detail.index);
    };

    async function start() {
      if (cancelled) return;
      try {
        const { createMind } = await import('@/lib/mind/scene');
        if (cancelled || !canvas) return;
        handle = createMind(canvas, {
          reducedMotion: motion.matches,
          // Where each stop puts its words, so the reading light can sit on that side.
          // Read from the authored stop table rather than guessed at: `align` is the
          // same field the DOM lays the columns out with, so the light and the type
          // cannot disagree about which half of the frame is being read.
          textSides: TEXT_SIDES,
          // Deliberately no `onArriveAtStop` here. The scene arrives on its own clock —
          // displayProgress eases toward the pushed value over ~125ms — and the DOM's
          // lit stop is written from scroll by ScrollProgress. Wiring both to the same
          // attribute made them fight and lose: a jump to stop 3 left `data-stop="2"`
          // on <html> (the camera, still catching up) next to `data-active` on the
          // pivot section (the scroll, already there). One writer, or neither is right.
          // The callback stays on MindOptions for the chat step, which needs to know
          // when the camera has actually landed before it docks an answer.
          onContextLost: (reason) => {
            console.warn('[mind] webgl %s — the page keeps its dark ground', reason);
          },
        });
        handle.resize(canvas.clientWidth, canvas.clientHeight);
        handle.setPaused(document.hidden);
        setMind(handle);
      } catch (err) {
        console.warn('[mind] scene did not load', err);
      }
    }

    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotionChange);
    window.addEventListener('mjk:route', onRoute);

    // requestIdleCallback is still not in Safari as of 26.
    if ('requestIdleCallback' in window) {
      idle = window.requestIdleCallback(start, { timeout: 1500 });
    } else {
      timer = setTimeout(start, 0);
    }

    return () => {
      cancelled = true;
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle);
      if (timer) clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotionChange);
      window.removeEventListener('mjk:route', onRoute);
      setMind(null);
      handle?.dispose();
      handle = null;
    };
  }, []);

  return <canvas ref={ref} className="mind-canvas" aria-hidden="true" />;
}
