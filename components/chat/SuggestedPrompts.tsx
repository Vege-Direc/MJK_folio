'use client';

import { suggestedPrompts } from '@/content/static-copy';

export default function SuggestedPrompts({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="pb-4 flex flex-wrap gap-x-6 gap-y-2 items-baseline">
      <span className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-type-dim)]">TRY</span>
      {suggestedPrompts.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className="text-sm text-[color:var(--color-type-muted)] hover:text-[color:var(--color-accent)] transition-colors"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
