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
  const dockRef = useRef<HTMLDivElement>(null);

  /**
   * Publish the dock's real height as `--dock-h`.
   *
   * Every stop reserves its bottom padding from this. The two numbers that used to
   * guess at it were tuned against a ~110px dock and the dock is 173px now, which is
   * how an answer's verdict line and its citations ended up rendering inside the dock's
   * own black gradient — present, correct, and invisible. A ResizeObserver is the only
   * honest source, because the height changes with the wrapped prompt row, the error
   * line and the viewport.
   */
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const publish = () => {
      document.documentElement.style.setProperty('--dock-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    };
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    publish();
    return () => ro.disconnect();
  }, []);

  /**
   * Lift the dock clear of the on-screen keyboard on iOS.
   *
   * The keyboard shrinks the visual viewport without touching the layout viewport, so a
   * `position: fixed; bottom: 0` bar slides underneath it and the field the visitor is
   * typing into is the thing they can no longer see.
   */
  const [kbInset, setKbInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKbInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

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
    <div
      ref={dockRef}
      className="fixed inset-x-0 bottom-0 z-50"
      style={kbInset ? { transform: `translateY(-${kbInset}px)` } : undefined}
    >
      {/* Subtle gradient veil so type stays readable over WebGL */}
      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)] via-[color:var(--color-bg)]/85 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-6 md:px-10 pt-6 pb-4">
        {/*
          A transport failure is the visitor's problem to act on, not the system's state
          to narrate. This used to shout "⟶ THE MIND IS RESTING. THE PAGE STILL SCROLLS."
          in caps at someone who had asked a question and got nothing — explaining an
          internal condition they never enquired about, in the register of a status
          light. One quiet sentence, and it says what to do rather than what broke.
        */}
        {error && (
          <p className="pb-4 text-sm text-[color:var(--color-type-dim)]" role="status">
            Ask again in a moment.
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
          {/*
            No `autoFocus`. It put the caret in this field on load, which took Space and
            PageDown — the primary way through a nine-screen scroll-driven page — away
            from every keyboard visitor, unconditionally. The global keydown handler two
            dozen lines up carries a comment explaining that Space must not be stolen,
            and then `autoFocus` on this element stole it. Type-to-focus already buys the
            discoverability, and it correctly exempts Space.

            The focus ring is not decoration either: this is the only text field on the
            site and it had `outline: none` with nothing put back, so a keyboard visitor
            could not see where they were.
          */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the mind."
            maxLength={500}
            aria-label="Ask a question about Mathew"
            className="ask-input flex-1 bg-transparent text-[color:var(--color-type)] placeholder:text-[color:var(--color-type-dim)] outline-none py-3 text-base md:text-lg font-serif"
          />
          <span className="hidden md:block font-mono text-[10px] tracking-[0.15em] text-[color:var(--color-type-dim)]">
            ↵ SEND
          </span>
        </form>
      </div>
    </div>
  );
}
