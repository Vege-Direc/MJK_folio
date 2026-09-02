'use client';

import { suggestedPrompts } from '@/content/static-copy';

/**
 * Four ways in. On a phone they run as one horizontally scrollable row so the dock stays
 * about a hundred pixels tall; from `md` up they wrap as before.
 */
export default function SuggestedPrompts({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="pb-4 flex items-baseline gap-x-6 gap-y-2 overflow-x-auto md:overflow-visible md:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-type-dim)] shrink-0">TRY</span>
      {suggestedPrompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className="text-sm text-[color:var(--color-type-muted)] hover:text-[color:var(--color-accent)] transition-colors whitespace-nowrap shrink-0 md:whitespace-normal md:shrink"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
