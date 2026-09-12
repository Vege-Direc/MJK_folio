'use client';

import { useEffect, useRef } from 'react';
import { onSceneRevealing, releaseSceneBuild } from '@/lib/mind/handover';
import { INTRO, INTRO_FLOOR_MS, runIntro, type IntroRun } from '@/lib/mind/intro';
import { PORTRAIT } from '@/lib/mind/portrait-tone';

/**
 * The opening gate: the sentence, the portrait assembling out of dust, and the zoom
 * through it into the scene.
 *
 * IT IS SERVER-RENDERED EVEN THOUGH IT IS A CLIENT COMPONENT, and that is the point. The
 * markup below is in the first HTML the browser gets, which is what lets the sentence
 * paint with everything else instead of being written in by JavaScript — and the element
 * is `display: none` until the synchronous decision script in `app/layout.tsx` says
 * otherwise, so a visitor who should not see it never sees a frame of it. Nothing here
 * renders conditionally on `localStorage` or `matchMedia`: the markup is identical on the
 * server and the client, and only CSS decides.
 *
 * WHAT IT DOES NOT DO. It does not lock the body, it does not trap focus, and it does not
 * ask to be dismissed. Scroll, wheel, a key, a pointer, or the skip control all end it —
 * the first one, immediately.
 */
/**
 * How much of the CSS dead man is left, asked of the animation rather than estimated.
 *
 * `intro-expire` starts at FIRST PAINT and `performance.now()` counts from navigation
 * start, and the gap between those two is a whole network round trip — so guessing from
 * `performance.now()` is conservative by however long the document took to arrive, and on
 * a slow connection it would refuse to run a gate that had plenty of time. The animation
 * knows its own `currentTime`; ask it.
 *
 * `getAnimations` has been in every engine for years, but the fallback matters more than
 * usual here: getting this wrong in the optimistic direction means an animation cut in
 * half, so the fallback is the conservative estimate rather than "assume there is time".
 */
function expireRemaining(overlay: HTMLElement): number {
  if (typeof overlay.getAnimations !== 'function') {
    return INTRO.EXPIRE_MS - performance.now();
  }
  for (const a of overlay.getAnimations()) {
    if ((a as CSSAnimation).animationName !== 'intro-expire') continue;
    const t = a.currentTime;
    if (typeof t === 'number') return INTRO.EXPIRE_MS - t;
  }
  return INTRO.EXPIRE_MS - performance.now();
}

/**
 * Keys that navigate INSIDE the gate rather than asking to leave it.
 *
 * Tab is the one that matters and it is a genuine conflict in the contract: the skip
 * control must be the first tab stop, and any key must end the gate. Taken literally the
 * second rule makes the first unreachable — pressing Tab to get to the button dismisses
 * the gate before focus lands. A Tab press is navigation within the overlay, so it is not
 * a request to leave; every other key still is. The bare modifiers are here for the same
 * reason on a smaller scale: Shift on its own is half of Shift+Tab.
 */
const NAV_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta']);

export default function IntroGate() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const run = useRef<IntroRun | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    /*
     * The same question the decision script answered, asked of the DOM rather than of
     * `localStorage` a second time. Two readers of one decision cannot disagree; two
     * readers each making the decision can, and that disagreement would be an invisible
     * overlay over an inert page.
     */
    if (html.dataset.intro !== 'on') return;
    /*
     * Loud on purpose, and it should stay loud until a photograph exists.
     *
     * `PORTRAIT.placeholder` means the head being drawn is a synthetic one — implicit
     * surfaces and a Lambertian key light — built so the pipeline, the composition and
     * the timing could be judged before there was anything to quantise. It reads as a
     * person. It does not read as Mathew, and the sentence beside it says his name.
     */
    if (PORTRAIT.placeholder) {
      console.warn(
        '[intro] the portrait is the synthetic placeholder, not a photograph of MJK — ' +
          'regenerate with `npx tsx scripts/make-portrait.ts <photo>` before this is public',
      );
    }
    const els = {
      root: root.current,
      canvas: canvas.current,
      ground: ground.current,
      copy: copy.current,
    };
    if (!els.root || !els.canvas || !els.ground || !els.copy) return;
    const overlay = els.root;

    /*
     * IT WILL NOT START IF IT CANNOT FINISH.
     *
     * The CSS dead man runs from first paint and cuts the overlay at `EXPIRE_MS`
     * regardless of what JavaScript is doing. So a gate that begins its 1,740ms floor
     * with less than that left on that clock is a gate that will be truncated mid-zoom,
     * which looks like a bug and is one. Hydration this late also means the visitor has
     * already waited longer for the page than the whole animation was ever going to take
     * — they have earned the page, not a title card. Measured in a deliberately slow
     * browser this fires; on any machine that hydrates in under about 2.8s it never does.
     */
    if (expireRemaining(overlay) < INTRO_FLOOR_MS) {
      delete html.dataset.intro;
      document.getElementById('page-root')?.removeAttribute('inert');
      return;
    }
    // Tells the pre-hydration dismissal in `app/layout.tsx` to stand down: the running
    // gate owns the exit from here, and it has a 220ms one rather than a hard cut.
    html.dataset.introLive = '1';

    let ended = false;
    /**
     * Put the page back exactly as the server sent it: the attribute the CSS keys on,
     * and the `inert` the second inline script put on `#page-root`. Everything else the
     * gate touched is inside the overlay, which stops being displayed.
     */
    const end = () => {
      if (ended) return;
      ended = true;
      delete html.dataset.intro;
      delete html.dataset.introLive;
      document.getElementById('page-root')?.removeAttribute('inert');
      // `true`, not bare. A capturing listener and a bubbling one are two different
      // entries in the list, so `removeEventListener` without the flag removes nothing
      // and every one of these would have outlived the gate that added them.
      window.removeEventListener('wheel', dismiss, true);
      window.removeEventListener('touchmove', dismiss, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('scroll', dismiss, true);
      overlay.removeEventListener('animationend', onExpire);
      unsubscribe();
      clearTimeout(release);
    };

    /*
     * The CSS dead man's switch fired, which means one of two things: the bundle never
     * ran (in which case nothing is listening and the overlay simply goes), or hydration
     * was so slow that 4,600ms from FIRST PAINT arrived before the animation finished.
     * The second case is why this listener exists. The keyframe only hides the overlay;
     * `data-intro` and the `inert` on `#page-root` are JavaScript's to remove, and an
     * invisible overlay over a page nobody can focus is worse than a visible one.
     */
    const onExpire = (e: AnimationEvent) => {
      // By name, not by target: `animationend` bubbles, and a future descendant with an
      // animation of its own must not be able to end the gate by finishing.
      if (e.animationName === 'intro-expire') end();
    };
    overlay.addEventListener('animationend', onExpire);

    /*
     * Any input at all ends it, and `capture: true` so nothing inside the overlay can
     * swallow the gesture first. Passive because none of these is prevented — a visitor
     * who flicks to scroll should scroll, and lose the intro rather than the gesture.
     *
     * `keydown` and not `keyup`: a screen reader user navigating with single-character
     * quick keys is exactly the visitor who should not be held, and their first keystroke
     * is the earliest honest signal that they are trying to read the page.
     */
    const dismiss = () => run.current?.dismiss();
    const onKey = (e: Event) => {
      if (!NAV_KEYS.has((e as KeyboardEvent).key)) dismiss();
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener('wheel', dismiss, opts);
    window.addEventListener('touchmove', dismiss, opts);
    window.addEventListener('keydown', onKey, opts);
    window.addEventListener('pointerdown', dismiss, opts);
    window.addEventListener('scroll', dismiss, opts);

    /*
     * `onSceneRevealing` fires IMMEDIATELY if the scene has already started fading up,
     * and on a warm cache it has: the chunk is in memory, `createMind` runs, and the
     * reveal can beat hydration. The naive `() => run.current?.sceneRevealed()` drops
     * exactly that case on the floor — `run.current` is still null on this line — and the
     * fastest visitor on the site would have been held for the full ceiling because the
     * scene arrived too early to be noticed. Latch it, and apply it either way.
     */
    let revealedEarly = false;
    const unsubscribe = onSceneRevealing(() => {
      if (run.current) run.current.sceneRevealed();
      else revealedEarly = true;
    });

    /*
     * Hand the main thread to `createMind` at the HOLD.
     *
     * The scene's bytes were requested the moment `MindCanvas` mounted; this releases
     * only the build, which is the expensive part, into the beat where the portrait is
     * nearly still. A timer rather than a callback out of the frame loop because it is
     * one number in one direction and threading it back through `runIntro` would have
     * made the animation know what a scene is.
     */
    /*
     * A frame or two INTO the hold, not at the instant it begins.
     *
     * `createMind` is a single unyielding block — it builds the near network, the tubes,
     * the node instances and the nebula without returning to the event loop — so whatever
     * is on screen when it starts is what the visitor looks at until it finishes.
     * Releasing it exactly at `HEAD_MS` races the frame that finishes the assembly, and
     * losing that race means the portrait freezes half-formed. 120ms is two frames of
     * insurance for something measured in hundreds.
     */
    const release = setTimeout(releaseSceneBuild, INTRO.HEAD_MS + 120);

    run.current = runIntro({ canvas: els.canvas, ground: els.ground, copy: els.copy }, PORTRAIT, end);
    if (revealedEarly) run.current.sceneRevealed();

    return () => {
      run.current?.stop();
      run.current = null;
      end();
    };
  }, []);

  return (
    <div className="intro" ref={root}>
      <div className="intro-ground" ref={ground} aria-hidden="true" />
      {/*
        `aria-hidden`, like `.mind-canvas`. It is a decorative rendering of a photograph
        and the sentence beside it says who it is; announcing a canvas element adds a
        landmark with nothing in it.
      */}
      <canvas className="intro-canvas" ref={canvas} aria-hidden="true" />
      <div className="intro-copy" ref={copy}>
        {/*
          The sentence, and it belongs to the animation rather than to the hero — those
          are two different pieces of copy and conflating them was an error the owner
          corrected. This one introduces; the hero's own closing line invites.

          "my mind" is the best phrase written for this site. "welcome" is not here
          because NN/g's guideline 92 objects to precisely that word, and "let's have a
          chat" is not here because it writes a cheque the guard may bounce — six of ten
          buying enquiries were refused when task 27a measured it.
        */}
        <p className="intro-line">I&rsquo;m Mathew. This is my mind &mdash; ask it something.</p>
      </div>
      <button type="button" className="intro-skip" onClick={() => run.current?.dismiss()}>
        Skip
      </button>
    </div>
  );
}
