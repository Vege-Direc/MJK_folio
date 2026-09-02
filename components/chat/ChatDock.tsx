'use client';

import { useEffect, useRef, useState } from 'react';
import AnswerBlock from './AnswerBlock';
import { useAsk } from './ChatProvider';
import SuggestedPrompts from './SuggestedPrompts';
import { useAnswerTarget } from './useAnswerTarget';

/**
 * Persistent chat dock. Never hidden. Full-width bar across the viewport bottom.
 *
 * The dock owns the input and nothing else. The answer docks into the stop it belongs to
 * (see AnswerPortal); the dock only shows it here, compactly, when no stop container is on
 * the page to receive it. Palette: DOM tokens only, never the WebGL orange.
 */
export default function ChatDock() {
  const { answer, asking, error, ask } = useAsk();
  const docked = useAnswerTarget(answer?.envelope?.stopId ?? null) !== null;
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      // Space scrolls a long-scroll page. Stealing it to focus the input takes the
      // primary way through this site away from anyone who reads with the keyboard.
      if (e.key === ' ') return;
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (value: string) => {
    const question = value.trim();
    if (!question || asking) return;
    ask(question);
    setInput('');
  };

  const showInline = answer !== null && !docked;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      {/* Subtle gradient veil so type stays readable over WebGL */}
      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)] via-[color:var(--color-bg)]/85 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-6 md:px-10 pt-6 pb-4">
        {error && (
          <p className="pb-4 font-mono text-xs tracking-[0.1em] text-[color:var(--color-type-dim)]">
            ⟶ THE MIND IS RESTING. THE PAGE STILL SCROLLS.
          </p>
        )}

        {showInline && !error && (
          <div className="max-h-[45vh] overflow-y-auto pb-4">
            <AnswerBlock answer={answer} compact />
          </div>
        )}

        {answer === null && (
          <SuggestedPrompts
            onPick={(p) => {
              setInput(p);
              inputRef.current?.focus();
            }}
          />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-4 border-t border-[color:var(--color-rule)] pt-4"
        >
          <span
            className={`font-mono text-[10px] tracking-[0.2em] transition-colors ${
              asking ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-type-dim)]'
            }`}
            aria-live="polite"
          >
            {asking ? '⟶ ANSWERING' : '⟶ ASK'}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the mind."
            maxLength={500}
            aria-label="Ask a question about Mathew"
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
