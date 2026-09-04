'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { STOPS, type StopId } from '@/content/stops';
import { stopPrompts, suggestedPrompts } from '@/content/static-copy';

/** Above this width all four are shown at once and nothing rotates. */
const WIDE = '(min-width: 768px)';

/** How long each suggestion holds before the next one fades in. */
const DWELL = 4500;

/**
 * Two full passes, then it stops for good.
 *
 * A perpetual animation in the corner of the eye of someone reading is the thing this
 * project's own performance notes warn about, and by the eighth change every suggestion
 * has been seen twice. After that the chip holds whatever it was showing.
 */
const ROTATIONS = suggestedPrompts.length * 2;

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/**
 * Which stop is on screen, read from the attribute `ScrollProgress` already maintains.
 *
 * The same source `ChatProvider.viewingStop()` uses when it tells the server where the
 * visitor is, so the chips and the routing cannot disagree about what "here" means. An
 * attribute rather than shared state because `ScrollProgress` writes it from a rAF loop and
 * has one authority over it; a second copy in React would be a second thing to keep in step.
 */
function subscribeStop(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-stop'] });
  return () => observer.disconnect();
}

function readStop(): StopId | null {
  const index = Number(document.documentElement.dataset.stop);
  if (!Number.isInteger(index)) return null;
  return STOPS.find((s) => s.index === index)?.id ?? null;
}

/**
 * Ways in to the site, one at a time on a phone and all four on a desktop.
 *
 * MJK: "On mobile the suggested questions … take up too much space at the bottom when
 * viewing on mobile and cover a lot of other information." He is right and the numbers
 * are worse than they look. The dock is 214px of a 390x664 viewport — 32% of the screen,
 * and 41% at 320px — because this row wraps to four lines on every phone. Showing one at
 * a time takes the dock to 137px and roughly doubles the page still visible behind it
 * with the keyboard up.
 *
 * His own suggestion was to cycle them inside the input as a placeholder. That recovers
 * a little more height and it was not taken, for two reasons that survive the trade: a
 * placeholder is not a control, so a one-tap affordance becomes retyping the sentence on
 * a phone keyboard; and it disappears on the first keystroke, which is the moment a
 * hesitant visitor most wants to see what can be asked. This keeps a real button.
 *
 * The rotation stops the moment the visitor does anything — types a character, asks a
 * question, focuses or hovers the row. A control that changes between the visitor
 * deciding to press it and pressing it is an unusable control, and that is the single
 * most important line in this file.
 */
export default function SuggestedPrompts({
  onPick,
  frozen = false,
}: {
  onPick: (p: string) => void;
  /** The visitor has typed or asked something. They no longer need to be shown the way in. */
  frozen?: boolean;
}) {
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    // The server has no viewport. Rendering all four is the honest default: it is what a
    // desktop gets, it is what a phone gets before hydration, and it never hides a
    // suggestion that was on screen a frame ago.
    () => true,
  );

  /*
   * The stop the visitor is on, so the four questions are the ones THIS section provokes.
   *
   * The server snapshot is `null`, which resolves to the hero's four — the honest answer
   * before a scroll position exists, and the set a visitor sees on arrival anyway.
   */
  const stop = useSyncExternalStore(subscribeStop, readStop, () => null);
  const prompts = (stop && stopPrompts[stop]) ?? suggestedPrompts;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const turns = useRef(0);
  const stopped = useRef(false);

  /*
   * A new section is a new set, and a new budget.
   *
   * Adjusted during render rather than in an effect, the same bargain `ChatProvider` strikes
   * for `showOriginal`: an effect would render one frame of the new section showing the old
   * section's suggestion at whatever index it had reached. Resetting the index matters
   * because the sets are the same length but not the same strings — index 2 of §04 is not
   * index 2 of §07 — and resetting the two-pass budget matters because the budget is about
   * having seen every suggestion, and these are suggestions nobody has seen yet.
   */
  const [lastStop, setLastStop] = useState(stop);
  if (stop !== lastStop) {
    setLastStop(stop);
    setIndex(0);
  }

  /*
   * The two-pass budget is per stop, and it is reset in an effect rather than beside the
   * index above because these two are refs and a ref may not be written during render — the
   * index is state, so it can be. The split is not merely lint appeasement: the effect runs
   * after the render that changed the set, which is the correct moment. It costs at most one
   * dwell of delay before the new section starts rotating, and buys that the visitor is
   * never shown a suggestion mid-swap.
   */
  useEffect(() => {
    turns.current = 0;
    stopped.current = false;
  }, [stop]);

  useEffect(() => {
    if (wide || frozen || paused || stopped.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(() => {
      turns.current += 1;
      if (turns.current >= ROTATIONS) stopped.current = true;
      setIndex((i) => (i + 1) % prompts.length);
    }, DWELL);
    return () => window.clearTimeout(id);
  }, [wide, frozen, paused, index, prompts.length]);

  const shown = wide ? prompts : [prompts[index % prompts.length]];

  return (
    <div
      className="prompt-row"
      data-rotating={wide ? undefined : ''}
      /*
       * Never a live region. A control whose label changes every four and a half seconds
       * and announces each change is the worst possible version of this feature.
       */
      aria-live="off"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {shown.map((p) => (
        <button
          // Keyed on the text so the cross-fade has two elements to fade between rather
          // than one element whose text content changes underneath the transition.
          key={p}
          type="button"
          onClick={() => {
            stopped.current = true;
            onPick(p);
          }}
          className="prompt-chip"
          // The visible text reads as a question addressed to the visitor. The label says
          // what pressing it does.
          aria-label={`Suggested question: ${p}`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
