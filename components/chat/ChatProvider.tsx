'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
/**
 * Whether the reader has taken the page over since the flight started.
 *
 * MEASURED THE WRONG WAY FIRST, and the wrong way is instructive. The first version
 * compared `window.scrollY` against where the flight had been aimed, on the theory that a
 * reader who had moved would be somewhere else. But the section grows by hundreds of pixels
 * as the answer streams, and the browser's own scroll anchoring moves `scrollY` to keep the
 * document steady -- `overflow-anchor: none` is set across the answer, not across the page.
 * So the position had always drifted by the time the correction ran, every question looked
 * like a reader who had taken over, and two of four flows on a phone were left exactly as
 * broken as before: -1000px and 0% of the answer on screen.
 *
 * Intent is the honest test, and `flyTo` already knows what it looks like: a wheel, a touch,
 * a key. Module scope because it is one page and one reader, and because holding it in state
 * would re-render the whole tree to record a boolean nothing renders.
 */
let readerMoved = false;
let releaseWatch: (() => void) | null = null;

function watchForReader(): void {
  releaseWatch?.();
  readerMoved = false;
  const moved = () => {
    readerMoved = true;
  };
  const opts = { passive: true, once: true } as const;
  // `flyTo` installs its own copies of these to cancel the flight itself. These outlive the
  // flight, because the question this one answers is asked after the answer has settled.
  window.addEventListener('wheel', moved, opts);
  window.addEventListener('touchstart', moved, opts);
  window.addEventListener('keydown', moved, { once: true });
  releaseWatch = () => {
    window.removeEventListener('wheel', moved);
    window.removeEventListener('touchstart', moved);
    window.removeEventListener('keydown', moved);
    releaseWatch = null;
  };
}

function goToStop(route: RouteData) {
  const el = document.getElementById(route.stopId);
  if (el) {
    watchForReader();
    flyTo(landingFor(el, document.getElementById(`answer-${route.stopId}`)));
  }
  window.dispatchEvent(new CustomEvent<RouteData>(ROUTE_EVENT, { detail: route }));
}

/**
 * How much better the correction has to be before it is worth moving the page.
 *
 * An answer that landed well leaves this alone, and that is the whole safety property: the
 * test is not "is something wrong" but "is there a better position", asked of the same
 * function that chose the first one.
 */
const SETTLE_MIN = 24;

/**
 * Put the finished answer back on the screen.
 *
 * The flight is aimed before the answer exists. `#answer-<stopId>` is an empty div at that
 * moment, so `landingFor` is working from ANSWER_ROOM -- a guess -- and the section then
 * grows by 700-1,000px as the prose arrives. Because `.content-zone` is vertically centred
 * and `overflow-anchor` is switched off across the answer, that growth moves the answer's
 * first line UPWARDS past the top of the screen, and nothing ever looked again.
 *
 * Measured on a phone at 390x664, four flows out of four: the answer's top landed at -51px,
 * -126px, -230px and -999px. At -999 the entire 664px screen was the contact link list and
 * NONE of the answer was visible -- for the question "can you build a WhatsApp ordering bot
 * for my restaurant, and what would it cost?", which is the most valuable question the site
 * can be asked.
 *
 * Two things keep this from becoming a page that grabs the scroll. It only acts when the
 * answer's start is actually off the readable band, so an answer that landed well is left
 * alone; and it does nothing at all if the reader has moved since the flight, on the same
 * principle `flyTo` already follows -- a flight is a suggestion, and the moment the visitor
 * touches the page it is over.
 */
function settleOnAnswer(stopId: StopId): void {
  const section = document.getElementById(stopId);
  const container = document.getElementById(`answer-${stopId}`);
  if (!section || !container) return;

  // The reader has taken over. Their position is theirs.
  if (readerMoved) return;

  /*
   * MEASURED THE WRONG WAY TWICE, and this is the second one.
   *
   * The version before this asked whether the answer's FIRST LINE was on the readable band,
   * and moved the page only if it was not. That fixed the phone, where four flows of four
   * had the answer above the top of the screen, and did nothing for the desktop, where the
   * opposite failure was waiting: on §08 at 1440x900 the answer started at 506px, so its
   * first line was perfectly visible and its last 274px were destroyed by the dock, with
   * the visible text ending mid-sentence. Two of six desktop flows ran past it. A test for
   * "is the start visible" cannot see that, because nothing is wrong at the start.
   *
   * So the test is not whether something is wrong. It is whether there is a better
   * position, asked of the same function that chose the first one -- which already prefers
   * the section's own top and gives it up only for as much of the answer as the band can
   * hold. An answer that landed well produces a landing equal to where the page already is,
   * and nothing moves.
   */
  const landing = landingFor(section, container);
  if (Math.abs(landing - window.scrollY) < SETTLE_MIN) return;

  releaseWatch?.();
  flyTo(landing);
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
 * So the section's top is still the landing, and it is only given up when keeping it
 * would hide the answer — then the page goes exactly far enough to open ROOM below where
 * the answer will start, and not one pixel further.
 *
 * "Exactly far enough" is the correction, and it was a real bug in between. Aiming the
 * answer at a fixed fraction of the band instead measured a 214px overshoot on a 1440
 * desktop, which put §07's title and kicker off the top of the screen: `.content-zone` is
 * vertically centred there, so the answer container already sits near the middle and
 * pulling it higher scrolls past the heading for no gain. Every desktop section now
 * lands exactly where it did before this function existed.
 *
 * `--dock-h` is subtracted because the dock is fixed over the foot of the viewport, so
 * the readable band ends where the dock begins, not where the screen does.
 */

/**
 * Room to leave under the answer's first line: roughly a dek and four lines of prose.
 *
 * Only a guess, and only used while it has to be one. At routing time the answer container
 * is an empty div with no height, because the envelope arrives at ~15ms and the prose has
 * not started; once the answer has settled this function is called again and measures the
 * real thing instead.
 */
const ANSWER_ROOM = 200;

/**
 * A strip of the section left above the answer when the answer is too tall to fit anyway.
 *
 * An answer taller than the readable band cannot be shown whole from any scroll position,
 * so the choice is only where to start reading it, and the start is the right place -- a
 * landing that shows the middle of a paragraph reads as a broken page. But putting the
 * first line hard against the top of the screen leaves nothing above it, and the visitor
 * has no way to tell they are inside a section rather than on a new page. 64px is one line
 * of the section's own body text, which is enough to say where they are.
 */
const CONTEXT_ABOVE = 64;

function landingFor(section: HTMLElement, answer: HTMLElement | null): number {
  const top = section.getBoundingClientRect().top + window.scrollY;
  if (!answer) return top;

  const dock = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dock-h'), 10);
  const readable = window.innerHeight - (Number.isFinite(dock) ? dock : 0);
  const box = answer.getBoundingClientRect();
  const answerFromTop = box.top + window.scrollY - top;

  // The answer's own height when it has one; zero means it has not arrived yet. Capped so
  // an answer longer than the screen starts at its first line rather than dragging the
  // landing down to make room for prose that runs past the dock regardless.
  const room = box.height > 0 ? Math.min(box.height, readable - CONTEXT_ABOVE) : ANSWER_ROOM;

  const shortfall = answerFromTop + room - readable;
  return shortfall > 0 ? top + shortfall : top;
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

  /*
   * One correction per answer, after it has stopped growing.
   *
   * Keyed on the question rather than on `answer`, which is a fresh object on every
   * streamed token; and gated on `!asking` so it runs when the stream is finished rather
   * than dozens of times while it arrives. The guard rewrites the envelope once more after
   * that, which can only shorten the answer, and a shorter answer cannot push its own first
   * line off the top.
   */
  const settledStop = !asking ? (answer?.envelope?.stopId ?? null) : null;
  const settledQuestion = !asking ? (answer?.question ?? null) : null;
  useEffect(() => {
    if (!settledStop || !settledQuestion) return;
    // One frame, so the collapse of the authored paragraph and the swap's height
    // transition have both been laid out before anything is measured.
    const id = requestAnimationFrame(() => settleOnAnswer(settledStop));
    return () => cancelAnimationFrame(id);
  }, [settledStop, settledQuestion]);

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
