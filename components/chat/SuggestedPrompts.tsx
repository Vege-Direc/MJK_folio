'use client';

import { suggestedPrompts } from '@/content/static-copy';

export default function SuggestedPrompts({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pb-2 text-xs text-[color:var(--color-type-muted)]">
      {suggestedPrompts.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className="hover:text-[color:var(--color-accent)] transition-colors"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
