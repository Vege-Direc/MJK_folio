'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef } from 'react';
import { emit } from '@/lib/bus';
import SuggestedPrompts from './SuggestedPrompts';

/**
 * Persistent chat dock. Never hidden. Full-width bar across the viewport bottom.
 * Any keystroke on the page focuses the input.
 */
export default function ChatDock() {
  const { messages, input, handleInputChange, handleSubmit, status, data } = useChat({
    api: '/api/chat',
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Type-anywhere: any printable keystroke on the document focuses the dock.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isEditable = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (isEditable) return;
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Bridge tool-call events from the stream to the WebGL bus.
  useEffect(() => {
    if (!data) return;
    for (const evt of data as any[]) {
      if (evt?.tool === 'route_to_section') {
        emit('section:activate', { section: evt.args.section, memoryId: evt.args.memory_id });
      }
    }
  }, [data]);

  const answering = status === 'streaming' || status === 'submitted';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--color-rule)] bg-[color:var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto max-w-5xl px-6 py-3">
        <SuggestedPrompts onPick={(p) => { (inputRef.current!.value = p); inputRef.current?.focus(); }} />
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.15em] text-[color:var(--color-type-dim)]">
            {answering ? 'ANSWERING →' : 'ASK →'}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Ask the mind anything…"
            className="flex-1 bg-transparent text-[color:var(--color-type)] placeholder:text-[color:var(--color-type-dim)] outline-none py-3 text-base"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
