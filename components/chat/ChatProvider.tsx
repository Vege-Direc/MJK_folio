'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { STOPS, type StopId } from '@/content/stops';
import { ROUTE_EVENT, type AskUIMessage, type EnvelopeData, type RouteData } from '@/lib/ask/types';
import { flyTo } from '@/lib/flight';

/**
 * One chat, shared by the dock (input) and the answer (wherever it docks on the page).
 *
 * The wire format is `{ question, history }`, never a messages array: roles are assigned on
 * the server so a forged `system` or `assistant` turn cannot reach the model. This is the
 * one place the client's message list is flattened back into that shape.
 */

export type Answer = {
  /** What was asked. */
  question: string;
  /** The layout envelope, once the server has chosen the stop. */
  envelope: EnvelopeData | null;
  /** The prose streamed so far. */
  text: string;
  /** True while the stream is still open. */
  streaming: boolean;
  /** The body the visitor should read: the guard's replacement when there is one. */
  shown: string;
};

type ChatContextValue = {
  answer: Answer | null;
  asking: boolean;
  error: Error | undefined;
  ask: (question: string) => void;
  /**
   * The visitor has asked for the stop's own paragraph back.
   *
   * It restores the authored copy *alongside* the answer rather than instead of it —
   * nothing is discarded, so there is nothing to restore from and no second copy of the
   * answer to keep anywhere. The answer already lives in the message list; this is one
   * boolean about what is on screen, and it resets on the next question because the
   * next question is a new subject.
   */
  showOriginal: boolean;
  setShowOriginal: (v: boolean) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function textOf(message: AskUIMessage | undefined): string {
  if (!message) return '';
  return message.parts
    .filter((part): part is Extract<AskUIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function envelopeOf(message: AskUIMessage | undefined): EnvelopeData | null {
  if (!message) return null;
  // Same id on every write, so the SDK reconciles them into one part holding the latest.
  const part = message.parts.findLast((p) => p.type === 'data-envelope');
  return part && part.type === 'data-envelope' ? part.data : null;
}

/** The last four completed exchanges, as pairs, using the body the visitor actually saw. */
function historyOf(messages: AskUIMessage[]): { q: string; a: string }[] {
  const pairs: { q: string; a: string }[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role !== 'user' || messages[i + 1].role !== 'assistant') continue;
    const q = textOf(messages[i]).trim();
    const env = envelopeOf(messages[i + 1]);
    const a = (env?.body ?? textOf(messages[i + 1])).trim();
    if (q && a) pairs.push({ q, a });
    i++;
  }
  return pairs.slice(-4);
}

/**
 * The section the reader is looking at, read straight off the element `ScrollProgress`
 * already maintains. `data-stop` on `<html>` is an index; the server wants the id, and
 * wants it validated, so anything unrecognised becomes undefined and the server simply
 * carries on without a viewport.
 */
function viewingStop(): StopId | undefined {
  if (typeof document === 'undefined') return undefined;
  const index = Number(document.documentElement.dataset.stop);
  if (!Number.isInteger(index)) return undefined;
  return STOPS.find((s) => s.index === index)?.id;
}

/**
 * Take the page to the stop. The scene follows scroll the way it always does, so this is
 * also how the camera flies. Reduced motion gets an instant jump, which is what that
 * preference asks for, and `flyTo` handles that itself.
 *
 * This was `scrollIntoView({ behavior: 'smooth' })`. The native call gives no say over
 * duration or curve, and measured over 5,690px it spent 1,488ms travelling against the
 * tween's 745ms. It also cannot be told where to stop, which is the second half of this
 * function.
 */
function goToStop(route: RouteData) {
  const el = document.getElementById(route.stopId);
  if (el) flyTo(landingFor(el, document.getElementById(`answer-${route.stopId}`)));
  window.dispatchEvent(new CustomEvent<RouteData>(ROUTE_EVENT, { detail: route }));
}

/**
 * Where the flight should stop, which is not always the top of the section.
 *
 * The answer docks below the section's own paragraph, so landing on the section's top
 * edge only shows the answer if the section fits in one screen. On a phone five of the
 * nine do not, and a review of the live site caught the consequence: asked "have you
 * shipped anything I can look at?", the page flew to §07 and the answer arrived below the
 * fold, with only the static cards on screen. Ask, watch the page move, see nothing. It is
 * the worst possible outcome for the one interaction the site exists for.
 *
 * So the landing is the higher of two positions: the section's top, and far enough down
 * that the answer container sits a little above the middle of the readable band. On a
 * desktop, and on any section that fits, the first wins and nothing changes. Where they
 * disagree the answer wins, because a visitor who has just asked a question is looking
 * for the answer, not for the heading above it.
 *
 * `--dock-h` is subtracted because the dock is fixed over the foot of the viewport, so
 * the readable band stops where the dock starts, not where the screen does.
 */
function landingFor(section: HTMLElement, answer: HTMLElement | null): number {
  const top = section.getBoundingClientRect().top + window.scrollY;
  if (!answer) return top;

  const dock = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dock-h'), 10);
  const readable = window.innerHeight - (Number.isFinite(dock) ? dock : 0);
  const answerTop = answer.getBoundingClientRect().top + window.scrollY;

  // 0.42 rather than dead centre: the answer streams downward from here, so it wants more
  // room beneath it than above it.
  return Math.max(top, answerTop - readable * 0.42);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AskUIMessage>({
        api: '/api/ask',
        prepareSendMessagesRequest({ messages: sent }) {
          const asked = sent[sent.length - 1];
          const previous = sent.filter((m) => m.role === 'assistant').at(-1);
          return {
            body: {
              question: asked ? textOf(asked) : '',
              history: historyOf(sent.slice(0, -1)),
              // Where the reader is, and where the last answer landed. A question like
              // "more on these?" has its subject on the screen rather than in its words,
              // and an earlier answer from a different section is a distraction rather
              // than context. Both are read at send time, not held in state, so they
              // describe the moment the question was actually asked.
              viewing: viewingStop(),
              previousStopId: envelopeOf(previous)?.stopId,
            },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat<AskUIMessage>({
    transport,
    onData(part) {
      if (part.type === 'data-route') goToStop(part.data);
    },
  });

  const asking = status === 'submitted' || status === 'streaming';

  const answer = useMemo<Answer | null>(() => {
    const lastUserIndex = messages.findLastIndex((m) => m.role === 'user');
    if (lastUserIndex < 0) return null;
    const question = textOf(messages[lastUserIndex]);
    const reply = messages[lastUserIndex + 1];
    const envelope = envelopeOf(reply);
    const text = textOf(reply);
    const shown = envelope?.body ?? text;
    return { question, envelope, text, streaming: asking, shown };
  }, [messages, asking]);

  const [showOriginal, setShowOriginal] = useState(false);

  /*
   * A new question is a new subject, so the authored paragraph goes back under.
   *
   * Adjusted during render rather than in an effect. The effect version renders the new
   * answer once with the *previous* question's `showOriginal` still applied, then
   * corrects itself — a visible flash of the authored copy under an answer that did not
   * ask for it, and a cascading render for the linter to object to. Comparing against a
   * remembered value and setting during render is React's own answer to this.
   */
  const question = answer?.question ?? null;
  const [lastQuestion, setLastQuestion] = useState(question);
  if (question !== lastQuestion) {
    setLastQuestion(question);
    setShowOriginal(false);
  }

  const ask = useCallback(
    (question: string) => {
      const q = question.trim();
      if (!q || asking) return;
      void sendMessage({ text: q });
    },
    [asking, sendMessage],
  );

  const value = useMemo<ChatContextValue>(
    () => ({ answer, asking, error: error ?? undefined, ask, showOriginal, setShowOriginal }),
    [answer, asking, error, ask, showOriginal],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useAsk(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useAsk must be used inside <ChatProvider>');
  return ctx;
}
