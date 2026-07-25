'use client';

import { on } from '@/lib/bus';
import { useEffect, useState } from 'react';

/**
 * Docks into the section the model routes to.
 * Streamed answer content lives here — the chat bar only shows "answering →".
 */
export default function AnswerPanel() {
  const [state, setState] = useState<{ open: boolean; section?: string; content?: string }>({ open: false });
  useEffect(() => on('panel:open', ({ section, content }) => setState({ open: true, section, content })), []);
  useEffect(() => on('panel:close', () => setState({ open: false })), []);
  if (!state.open) return null;
  return (
    <aside className="fixed right-6 top-24 z-40 max-w-md rounded-[3px] border border-[color:var(--color-rule)] bg-[color:var(--color-bg)]/90 p-6 backdrop-blur">
      <div className="font-mono text-[10px] tracking-[0.15em] text-[color:var(--color-accent)] mb-3">
        {(state.section || '').toUpperCase()}
      </div>
      <div className="text-[color:var(--color-type)] leading-relaxed whitespace-pre-wrap">
        {state.content}
      </div>
    </aside>
  );
}
