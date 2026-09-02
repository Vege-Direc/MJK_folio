'use client';

import { suggestedPrompts } from '@/content/static-copy';

/**
 * Four ways in.
 *
 * They used to run as one horizontally scrollable row. At 375px that showed exactly one
 * prompt, clipped mid-word — "…aircraft to age" — with the other three off-screen and
 * nothing to say they existed. A scroller with no affordance is a scroller nobody
 * scrolls, and the edge mask was not enough to rescue it: the first prompt is wider than
 * the viewport on its own, so there was never a second one peeking to imply more.
 *
 * They wrap now. That costs height, and height stopped being expensive when the dock
 * began publishing `--dock-h` from a ResizeObserver: every stop reserves whatever the
 * dock actually is, so this row can be as tall as it needs and nothing ends up
 * underneath it. All four visible, none clipped, no affordance required.
 *
 * `TRY` is gone. It was mono chrome wearing a technical costume — the register the
 * timeline's years and the § labels earn and the dock's furniture does not — and on a
 * phone it also spent 40px of a 327px row saying what four questions already say by
 * being questions.
 */
export default function SuggestedPrompts({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="prompt-row">
      {suggestedPrompts.map((p) => (
        <button key={p} type="button" onClick={() => onPick(p)} className="prompt-chip">
          {p}
        </button>
      ))}
    </div>
  );
}
