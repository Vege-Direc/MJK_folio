'use client';

import { STOPS } from '@/content/stops';
import type { Answer } from './ChatProvider';
import { useAsk } from './ChatProvider';

/**
 * Cards inside the answer only where the stop has no media column of its own. On a
 * `cards`, `timeline`, `carousel` or `contact` stop the same memories already sit beside
 * the text; repeating them under the answer says the same thing twice.
 *
 * These are also the whole of the answer's provenance now. The `[project-taboola]`
 * chips that used to sit under the prose are gone: an internal id is developer output,
 * not something to print on a portfolio, and on the three stops where the reader would
 * otherwise see nothing, this list already names the same memories by their titles.
 */
function showsCards(stopId: string | undefined): boolean {
  const stop = STOPS.find((s) => s.id === stopId);
  return stop?.compose === 'plain';
}

/**
 * The ordinary answer kicker is `§ ANSWER · <STOP>`, assembled from the stop's own
 * kicker. Docked inside that stop, directly beneath `§ 05 — Aside`, it is the same
 * word twice and a second eyebrow stacked on the first — noise, not orientation.
 *
 * So the docked answer does not draw it, with one exception: a refusal carries
 * `§ NOT HERE`, which says something the stop's kicker does not and is the one case
 * where the reader genuinely needs telling that this is not an answer about this stop.
 * The rule is therefore "draw the kicker when it is not the ordinary one", and the
 * ordinary one is the only kicker the handler builds from a stop name.
 */
function isOrdinaryKicker(kicker: string | undefined): boolean {
  return (kicker ?? '').startsWith('§ ANSWER');
}

/**
 * One answer, laid out so that it is the foreground of the stop it lands in.
 *
 * The move that does that is COLOUR, not size. The answer's prose is the only body text
 * on the page rendered at full `--color-type`; the stop's own paragraph, the card
 * bodies, the dek and every label stay `--color-type-muted`. One token, and the answer
 * outranks everything around it without a border, a background, a panel or a second
 * heading competing with the stop's title. The 19px/17px step supports that; it is not
 * what carries it.
 *
 * Which is also why `envelope.title` is demoted here rather than promoted. It used to be
 * a 30px serif `<h3>` directly under the stop's own 70px serif title — two headings, one
 * subject, and on `cards` stops the answer's title was frequently the exact text of a
 * card 300px to its right. As a 20px muted dek it does the job a dek does: it tells you
 * what the paragraph below is about, and then gets out of the way.
 *
 * The stop's authored title is untouched. It is the stop's identity and the anchor the
 * smooth scroll lands on. The authored *paragraph* is what gives way, collapsing its
 * height in `AuthoredBody` so the answer is the only prose in the column — and
 * SHOW ORIGINAL brings it back without discarding the answer.
 *
 * Accessibility: the streaming body mutates dozens of times a second, so it is
 * `aria-hidden` while it streams and carries `aria-busy`; a visually-hidden live region
 * stays mounted from the first render and receives the finished text once, which is what
 * a screen reader should hear. Mounting a live region that already contains its text is
 * the classic way to have it announced by nobody.
 * Palette: DOM tokens only. The WebGL orange never appears here.
 */
export default function AnswerBlock({ answer, compact = false }: { answer: Answer; compact?: boolean }) {
  const { envelope, shown, streaming, question } = answer;
  const { showOriginal, setShowOriginal } = useAsk();
  const done = !streaming && envelope !== null && envelope.status !== 'streaming';

  // Compact means the dock is showing this itself, with no stop kicker above it, so the
  // envelope's kicker is the only orientation there is.
  const kicker = compact ? envelope?.kicker : isOrdinaryKicker(envelope?.kicker) ? null : envelope?.kicker;

  return (
    <article className={compact ? 'answer answer-compact' : 'answer'} aria-busy={streaming || undefined} data-status={envelope?.status ?? 'pending'}>
      {kicker && <p className="answer-kicker">{kicker}</p>}

      <div className="answer-asked">
        <p className="answer-question">
          <span className="answer-asked-label">ASKED</span>
          {question}
        </p>
        {!compact && (
          <button type="button" className="answer-toggle" onClick={() => setShowOriginal(!showOriginal)}>
            {showOriginal ? 'Hide the section' : 'Show original'}
          </button>
        )}
      </div>

      {envelope && <p className="answer-dek">{envelope.title}</p>}

      <p className="answer-prose" aria-hidden={streaming || undefined}>
        {shown}
        {streaming && <span className="answer-caret motion-safe:animate-pulse" aria-hidden="true" />}
      </p>

      {/*
        Mounted from the first render and empty until the guard has had the last word, so
        the region exists before its content does. A live region inserted with its text
        already in it is not reliably announced.
      */}
      <p className="sr-only" aria-live="polite">
        {done ? shown : ''}
      </p>

      {envelope && envelope.cards.length > 0 && !compact && showsCards(envelope.stopId) && (
        <ul className="answer-cards">
          {envelope.cards.map((card) => (
            <li key={card.id} id={`card-${card.id}`}>
              <span className="answer-card-kicker">{card.kicker}</span>
              <span className="answer-card-title">{card.title}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
