'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import SuggestedPrompts from './SuggestedPrompts';

/**
 * Persistent chat dock. Never hidden. Full-width bar across the viewport bottom.
 *
 * The answer area above the input is deliberately plain, and temporary: until this commit
 * the streamed response had nowhere to go at all -- the dock rendered no messages and the
 * panel that was supposed to show them had already been deleted -- so the site could hold
 * a conversation nobody could read. It stays a paragraph of text until the generative
 * layout lands, and then it goes.
 */

/** The prose of a message, concatenated across its text parts. */
function textOf(message: UIMessage | undefined): string {
  if (!message) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

/**
 * The last four completed exchanges, as pairs.
 *
 * The wire format is `{ question, history }`, never a messages array: roles are assigned
 * on the server so a forged `system` or `assistant` turn cannot reach the model. That
 * makes this the one place the client's message list has to be flattened back into the
 * shape the route accepts.
 */
function historyOf(messages: UIMessage[]): { q: string; a: string }[] {
  const pairs: { q: string; a: string }[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role !== 'user' || messages[i + 1].role !== 'assistant') continue;
    const q = textOf(messages[i]).trim();
    const a = textOf(messages[i + 1]).trim();
    if (q && a) pairs.push({ q, a });
    i++;
  }
  return pairs.slice(-4);
}

export default function ChatDock() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ask',
      prepareSendMessagesRequest({ messages: sent }) {
        const asked = sent[sent.length - 1];
        return {
          body: {
            question: asked ? textOf(asked) : '',
            history: historyOf(sent.slice(0, -1)),
          },
        };
      },
    }),
  });

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

  const answering = status === 'streaming' || status === 'submitted';

  /** The one answer on screen: the most recent assistant turn. */
  const answer = textOf(messages.findLast((m) => m.role === 'assistant'));

  const submit = (value: string) => {
    const question = value.trim();
    if (!question || answering) return;
    sendMessage({ text: question });
    setInput('');
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      {/* Subtle gradient veil so type stays readable over WebGL */}
      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)] via-[color:var(--color-bg)]/85 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-6 md:px-10 pt-6 pb-4">
        {(answer || error) && (
          <div className="max-h-56 overflow-y-auto pb-4 text-[color:var(--color-type-muted)] font-serif text-base md:text-lg leading-relaxed whitespace-pre-wrap">
            {error ? (
              <span className="font-mono text-xs tracking-[0.1em] text-[color:var(--color-type-dim)]">
                ⟶ THE COPILOT IS RESTING. THE PAGE STILL SCROLLS.
              </span>
            ) : (
              answer
            )}
          </div>
        )}

        {messages.length === 0 && (
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
              answering ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-type-dim)]'
            }`}
          >
            {answering ? '⟶ ANSWERING' : '⟶ ASK'}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the mind anything…"
            maxLength={2000}
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
