'use client';

import { useEffect, useRef } from 'react';
import { setMind } from '@/lib/mind/controller';
import { motionReduced, subscribeMotion } from '@/lib/motion';
import { STOPS } from '@/content/stops';
import { CFG, detectTier } from '@/lib/mind/config';
import type { FarNetwork, MindHandle } from '@/lib/mind/scene';

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

    /*
     * The effective preference, not the media query.
     *
     * This used to read `matchMedia` directly, both to seed the scene and to follow the OS
     * while the page was open. Since the dock gained the WCAG 2.2.2 control there are two
     * writers, and the naive version let them disagree: a visitor who had turned motion
     * back ON would have had it turned off again the next time the OS setting changed under
     * them. `lib/motion.ts` owns the precedence — an explicit choice outranks the operating
     * system, and the operating system is the default until there is one — and both of us
     * ask it rather than answering for ourselves.
     */
    const unsubscribeMotion = subscribeMotion(() => handle?.setReducedMotion(motionReduced()));
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box && handle) handle.resize(Math.round(box.width), Math.round(box.height));
    });
    const onVisibility = () => handle?.setPaused(document.hidden);

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
        /**
         * Both requests, at once.
         *
         * `far-network.json` is a static 67 KB the scene needs and three.js does not,
         * and until now it was fetched from inside `createMind` — which meant the
         * request could not be issued until the 141 KB chunk had finished downloading
         * AND finished executing. Measured on the deployed site at Fast 3G on a 375
         * viewport: chunk done at 5.8s, far network requested at 6.1s, done at 7.0s.
         * Two transfers that fit side by side were run end to end for no reason.
         *
         * Started here, they share the connection, and the far network — the smaller
         * of the two — normally lands first, so the scene has it in hand before it has
         * finished building the near network and the whole picture can arrive at once.
         *
         * On the mobile tier there is nothing to start: `CFG.mobile.farNetwork` is
         * false and the 67 KB is never requested. The reasoning, and the counting
         * behind it, is in the tier table. The gate is here as well as in the scene
         * because this is the only place that can decide NOT to open the connection.
         *
         * A failure resolves to `null` rather than rejecting: the far field's absence
         * has always been silent, and the scene treats "no far network" the same way
         * whether the file 404s or the machine was never going to draw it.
         */
        const farNetwork = CFG[detectTier(window)].farNetwork
          ? fetch('/far-network.json')
              .then((r) => (r.ok ? (r.json() as Promise<FarNetwork>) : null))
              .catch(() => null)
          : null;
        const { createMind } = await import('@/lib/mind/scene');
        if (cancelled || !canvas) return;
        handle = createMind(canvas, {
          reducedMotion: motionReduced(),
          // Where each stop puts its words, so the reading light can sit on that side.
          // Read from the authored stop table rather than guessed at: `align` is the
          // same field the DOM lays the columns out with, so the light and the type
          // cannot disagree about which half of the frame is being read.
          textSides: TEXT_SIDES,
          farNetwork,
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
        // The scene hides the canvas while it assembles and un-hides it on its own
        // first frame. If it dies in between, that inline opacity is the only trace it
        // leaves, and leaving it set would take the dark ground down with it — so the
        // failure path puts the element back the way the server rendered it. Which is
        // the whole fallback: a full-viewport rectangle of --color-bg.
        if (canvas) canvas.style.opacity = '';
        console.warn('[mind] scene did not load', err);
      }
    }

    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
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
      unsubscribeMotion();
      window.removeEventListener('mjk:route', onRoute);
      setMind(null);
      handle?.dispose();
      handle = null;
    };
  }, []);

  return <canvas ref={ref} className="mind-canvas" aria-hidden="true" />;
}
