'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { onMindReady } from '@/lib/mind/controller';
import { motionPref, setMotionPref, subscribeMotion, SERVER_MOTION } from '@/lib/motion';

/**
 * The control WCAG 2.2.2 asks for, and the reason it is not an apology.
 *
 * Pause, Stop, Hide is Level A. It reaches this scene through Conformance Requirement
 * 5.2.5 Non-Interference — "including content that is not otherwise relied upon to meet
 * conformance" — so being decoration is not an exemption, and its sufficient technique is
 * a control in the page rather than a media query. `prefers-reduced-motion` satisfies
 * 2.3.3, which is AAA. The site held the harder criterion and missed the mandatory one.
 *
 * WHERE IT SITS AND WHY. Last in the dock's own row, after the input and after Send. Three
 * things had to be true at once: it must always be available, because a mechanism that is
 * present only sometimes is not a mechanism; it must add no height, because the dock is
 * already 147px of a 664px phone screen and six of nine sections overrun it; and it must
 * not come before the input in the tab order, because a keyboard visitor reaching the dock
 * wants the field first. Last in the form row is the only position that is all three.
 *
 * WHY THE LABEL IS A STATE AND NOT AN INSTRUCTION. It reads CALM or MOTION — what is
 * happening now, in the same mono register as the section kickers — with the instruction
 * carried by `aria-label` and by `aria-pressed`, which is what a screen reader announces.
 * "Turn off animation" as visible text would be the loudest thing in the dock and would
 * read as a warning about the site's own scene.
 */
export default function MotionToggle() {
  const pref = useSyncExternalStore(subscribeMotion, motionPref, () => SERVER_MOTION);
  const calm = pref === 'calm';

  /*
   * The scene may not exist yet. It is imported from an idle callback so nine sections of
   * prose are interactive first, which means a visitor can press this before there is
   * anything to press it on. `onMindReady` fires immediately when the scene is already up
   * and waits when it is not, so both orders end in the same place.
   *
   * `data-motion` on the root is published for inspection and for any future rule that
   * wants to hook it. The DOM's own transitions deliberately stay on the media query: they
   * are short and visitor-initiated, and 2.2.2 is about what starts by itself and runs for
   * more than five seconds.
   */
  useEffect(() => {
    document.documentElement.dataset.motion = calm ? 'off' : 'on';
    return onMindReady((mind) => mind.setReducedMotion(calm));
  }, [calm]);

  return (
    <button
      type="button"
      className="motion-toggle"
      aria-pressed={calm}
      aria-label={calm ? 'Let the background move again' : 'Hold the background still'}
      onClick={() => setMotionPref(calm ? 'full' : 'calm')}
    >
      <span className="motion-toggle-mark" aria-hidden="true">
        {/*
          Two marks rather than one that changes meaning: a still ring for held, a ring with
          an arc leaving it for moving. Drawn rather than a glyph, because the dock's only
          other icon is the carousel's, and a font emoji here would be the one thing on the
          page rendered by the operating system.
        */}
        <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="6" cy="6" r="2.1" />
          {!calm && <path d="M6 1.4a4.6 4.6 0 0 1 4.3 3" strokeLinecap="round" />}
          {!calm && <path d="M6 10.6a4.6 4.6 0 0 1-4.3-3" strokeLinecap="round" />}
        </svg>
      </span>
      {calm ? 'CALM' : 'MOTION'}
    </button>
  );
}
