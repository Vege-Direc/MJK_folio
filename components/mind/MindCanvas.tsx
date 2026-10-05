'use client';

import { useEffect, useRef } from 'react';
import { setMind } from '@/lib/mind/controller';
import { sceneRevealing, whenSceneMayBuild } from '@/lib/mind/handover';
import { isFlying } from '@/lib/flight';
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
    /*
     * And the second answer, which is about route rather than speed.
     *
     * `goToStop` starts the page flight and then fires this event, so by the time we are
     * here a tween is already running toward that stop and `handle.getStop()` still holds
     * the stop the reader was at — the two ends of the journey, which nothing else on the
     * site has in one place. The scene decides whether they straddle its collateral; if
     * they do, the camera leaves the axon at the fork and rejoins at the merge, for the
     * length of the flight only.
     *
     * `isFlying()` is the guard and it is not decoration. This same event fires when the
     * reader has asked for a stop that is not in the document (`goToStop` skips the flight
     * and the dock shows the answer inline) and when reduced motion turns the flight into
     * an instant jump. Neither is a flight, and arming a detour in either case would leave
     * one running with nothing to come back and switch it off — `cancelFlight` is the only
     * caller of `endLane`, and it only runs when there was something to cancel.
     */
    const onRoute = (e: Event) => {
      const detail = (e as CustomEvent<{ stopId?: string; index?: number }>).detail;
      if (typeof detail?.index !== 'number' || !handle) return;
      handle.pulse(detail.index);
      if (isFlying()) handle.beginLane(handle.getStop(), detail.index);
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
        /*
         * `buildWaypoints` comes through `scene.ts`, not from `@/lib/mind/waypoints`
         * directly, and the reason is bundling rather than taste.
         *
         * It cannot be a static import at the top of this file: `waypoints.ts` imports
         * three.js, and hoisting it would drag the 563 KB three chunk into the entry
         * bundle — the exact cost this component's dynamic import exists to avoid.
         * Nor can it be a second `await import(...)` beside this one: measured on the
         * production build, that splits the scene's async chunk in two (497,069 +
         * 75,408 bytes in place of one 563,413) and buys the scene a second request
         * for no reason. One specifier, one chunk, and the module that requires the
         * waypoints is the one that publishes the way to build them.
         */
        const { createMind, buildWaypoints } = await import('@/lib/mind/scene');
        if (cancelled || !canvas) return;
        /*
         * The bytes are fetched as early as this component can ask for them; the BUILD
         * waits for permission. They are two different costs and they were being treated
         * as one.
         *
         * `createMind` is hundreds of milliseconds of main thread — it builds the near
         * network, the tube geometry, the node instances and the nebula — and the intro
         * gate is a full-screen animation whose opening beat runs in that same window.
         * So the gate holds this line until it reaches its HOLD, the beat where the
         * portrait is nearly still and dropped frames are least visible, and never holds
         * the transfer above.
         *
         * With no gate on screen — a returning visitor, reduced motion, a hash deep link,
         * which is most visits — this resolves in the same microtask and nothing is
         * deferred at all.
         */
        await whenSceneMayBuild();
        if (cancelled || !canvas) return;
        handle = createMind(canvas, {
          reducedMotion: motionReduced(),
          // How many stops there are, and where the camera stands at each, taken from
          // the authored stop table rather than from a literal inside the scene.
          // `scene.ts` used to default to `buildWaypoints(9)` and nothing passed this,
          // so the nine was the scene no matter what `content/stops.ts` said — and the
          // two disagreeing threw nothing. Same argument as `textSides` below: one
          // source, and the scene has no opinion about how many stops exist.
          waypoints: buildWaypoints(STOPS.length),
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
          /*
           * The one signal that means "the picture is arriving", as opposed to
           * `setMind` below, which only means "the handle exists". The scene fires this
           * on the frame its opacity ramp starts — after up to 1,200ms of waiting for
           * the far field — so anything handing the viewport over waits for this and not
           * for the handle. See MindOptions.onRevealStart.
           */
          onRevealStart: sceneRevealing,
          onContextLost: (reason) => {
            console.warn('[mind] webgl %s — the page keeps its dark ground', reason);
            // No WebGL, or the context went away: nothing is going to fade up, and that
            // is the same instruction to a waiting gate as the scene arriving. Without
            // it, every machine without WebGL would hold the intro to its full ceiling
            // waiting for a reveal that cannot happen.
            sceneRevealing();
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
        // Same argument as onContextLost: an intro gate waiting to hand over must be
        // told the handover will never come, or it holds the page for its whole ceiling
        // on exactly the visit where the scene chunk 404'd.
        sceneRevealing();
      }
    }

    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('mjk:route', onRoute);

    /*
     * Eagerly, and this used to be `requestIdleCallback(start, { timeout: 1500 })`.
     *
     * WHY THE IDLE CALLBACK HAD TO GO. It was there so nine sections of prose would be
     * interactive before three.js was even asked for. That reasoning does not survive
     * looking at when this line actually runs: it is an effect, so React has already
     * hydrated this tree by the time it executes. The prose is interactive. What the idle
     * callback was really buying was up to 1,500ms of nothing, on the critical path of the
     * one asset the page is slowest to get — measured at 140,024 B gzipped for the scene
     * chunk, about 1.04s of transfer at Fast 3G's 1.6 Mbit/s.
     *
     * AND IT IS SELF-DEFEATING UNDER THE INTRO GATE. `requestIdleCallback` cannot fire
     * during a full-screen animation; only its 1,500ms timeout can. So on precisely the
     * visit where a gate exists to cover the scene's arrival, the idle callback delayed
     * the arrival the gate was covering. Asking now, and holding only `createMind` (see
     * `whenSceneMayBuild` above), separates the transfer from the main-thread cost so the
     * gate can defer the second without touching the first.
     *
     * The window is no longer needed for anything here, so neither is the Safari branch:
     * `requestIdleCallback` is still not in Safari as of 26, which was the other half of
     * why that code had two paths.
     */
    void start();

    return () => {
      cancelled = true;
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
