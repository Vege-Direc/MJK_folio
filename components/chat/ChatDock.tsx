'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import { emit } from '@/lib/bus';
import SuggestedPrompts from './SuggestedPrompts';

/**
 * Persistent chat dock. Never hidden. Full-width bar across the viewport bottom.
 * Any keystroke on the page focuses the input. Answers stream into <AnswerPanel/>,
 * the dock stays quiet.
 */
export default function ChatDock() {
  const { input, handleInputChange, handleSubmit, status, data, messages } = useChat({
    api: '/api/chat',
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPrompts, setShowPrompts] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!data) return;
    for (const evt of data as any[]) {
      if (evt?.tool === 'route_to_section') {
        emit('section:activate', { section: evt.args.section, memoryId: evt.args.memory_id });
      }
    }
  }, [data]);

  useEffect(() => { if (messages.length > 0) setShowPrompts(false); }, [messages.length]);

  const answering = status === 'streaming' || status === 'submitted';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      {/* Subtle gradient veil so type stays readable over WebGL */}
      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)] via-[color:var(--color-bg)]/85 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-6 md:px-10 pt-6 pb-4">
        {showPrompts && (
          <SuggestedPrompts onPick={(p) => { if (inputRef.current) inputRef.current.value = p; inputRef.current?.focus(); }} />
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-4 border-t border-[color:var(--color-rule)] pt-4"
        >
          <span
            className={`font-mono text-[10px] tracking-[0.2em] transition-colors ${
              answering ? 'text-[color:var(--color-pulse)]' : 'text-[color:var(--color-type-dim)]'
            }`}
          >
            {answering ? '⟶ ANSWERING' : '⟶ ASK'}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Ask the mind anything…"
            className="flex-1 bg-transparent text-[color:var(--color-type)] placeholder:text-[color:var(--color-type-dim)] outline-none py-3 text-base md:text-lg font-serif"
            autoFocus
          />
          <span className="hidden md:block font-mono text-[10px] tracking-[0.15em] text-[color:var(--color-type-dim)]">
            ↵ SEND
          </span>
        </form>
      </div>
    </div>
  );
}
