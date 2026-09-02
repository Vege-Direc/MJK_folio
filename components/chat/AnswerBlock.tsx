'use client';

import { STOPS } from '@/content/stops';
import type { Answer } from './ChatProvider';

/**
 * Cards inside the answer only where the stop has no media column of its own. On a
 * `cards` stop the same memories already sit beside the text; repeating them under the
 * answer says the same thing twice.
 */
function showsCards(stopId: string | undefined): boolean {
  const stop = STOPS.find((s) => s.id === stopId);
  return stop?.compose === 'plain';
}

/**
 * One answer, laid out. Everything structural here (kicker, title, cards, cites) came from
 * the server's envelope; the model only wrote the prose, and the guard has already had
 * the last word on that prose by the time `status` is anything but `streaming`.
 *
 * Accessibility: the streaming body mutates dozens of times a second, so it is
 * `aria-hidden` while it streams and carries `aria-busy`; a separate visually-hidden
 * region receives the finished text once, which is what a screen reader should hear.
 * Palette: DOM tokens only. The WebGL orange never appears here.
 */
export default function AnswerBlock({ answer, compact = false }: { answer: Answer; compact?: boolean }) {
  const { envelope, shown, streaming, question } = answer;
  const done = !streaming && envelope !== null && envelope.status !== 'streaming';
  const statusLine =
    envelope?.status === 'verified'
      ? 'Checked against the corpus.'
      : envelope?.status === 'salvaged'
        ? envelope.note ?? 'Checked against the corpus; some lines removed.'
        : null;

  return (
    <article
      className={compact ? 'answer answer-compact' : 'answer mt-10 pt-6 border-t border-[color:var(--color-rule)] max-w-2xl'}
      aria-busy={streaming || undefined}
      data-status={envelope?.status ?? 'pending'}
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <span className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-accent)] uppercase">
          {envelope?.kicker ?? '§ ANSWER'}
        </span>
        <span className="font-mono text-[10px] tracking-[0.15em] text-[color:var(--color-type-dim)] truncate max-w-[50%]">
          asked: {question}
        </span>
      </div>

      {envelope && (
        <h3 className="font-serif text-2xl md:text-3xl leading-tight text-[color:var(--color-type)] tracking-[-0.01em] mb-4">
          {envelope.title}
        </h3>
      )}

      <p
        className="font-sans text-base md:text-lg leading-relaxed text-[color:var(--color-type-muted)] whitespace-pre-wrap"
        aria-hidden={streaming || undefined}
      >
        {shown}
        {streaming && (
          <span
            className="inline-block w-[2px] h-[1em] ml-1 align-text-bottom bg-[color:var(--color-accent)] animate-pulse"
            aria-hidden="true"
          />
        )}
      </p>

      {done && (
        <p className="sr-only" aria-live="polite">
          {shown}
        </p>
      )}

      {envelope && envelope.cards.length > 0 && !compact && showsCards(envelope.stopId) && (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {envelope.cards.map((card) => (
            <li key={card.id} id={`card-${card.id}`} className="border-t border-[color:var(--color-rule)] pt-3">
              <div className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-type-dim)] mb-1">
                {card.kicker}
              </div>
              <div className="font-serif text-lg text-[color:var(--color-type)] leading-snug">{card.title}</div>
            </li>
          ))}
        </ul>
      )}

      {(statusLine || (envelope && envelope.cites.length > 0)) && (
        <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 font-mono text-[10px] tracking-[0.12em] text-[color:var(--color-type-dim)]">
          {statusLine && <span>{statusLine}</span>}
          {envelope?.cites.map((id) => (
            <span key={id} className="opacity-80">
              [{id}]
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
