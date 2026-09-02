'use client';

import { suggestedPrompts } from '@/content/static-copy';

/**
 * Four ways in. On a phone they run as one horizontally scrollable row so the dock stays
 * about a hundred pixels tall; from `md` up they wrap as before.
 */
export default function SuggestedPrompts({ onPick }: { onPick: (p: string) => void }) {
  return (
    // The row scrolls horizontally on a phone with no affordance and no edge fade, so
    // prompts 2-4 were undiscoverable and the first one clipped mid-word. The mask says
    // there is more to the right without adding a control to a bar that has no room.
    <div className="prompt-row pb-3 flex items-baseline gap-x-6 gap-y-1 overflow-x-auto md:overflow-visible md:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="font-mono text-[10px] tracking-[0.15em] text-[color:var(--color-type-dim)] shrink-0">
        TRY
      </span>
      {suggestedPrompts.map((p) => (
        // `padding-block` is what takes these from ~20px tall to a real target; the
        // negative margin keeps the row the height it was.
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className="py-[6px] -my-[6px] text-sm text-[color:var(--color-type-muted)] hover:text-[color:var(--color-accent)] focus-visible:text-[color:var(--color-accent)] transition-colors whitespace-nowrap shrink-0 md:whitespace-normal md:shrink"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
