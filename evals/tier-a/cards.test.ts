/**
 * Every card asks a question that comes back to it.
 *
 * A card is a control now: pressing it sends `Tell me about {title}.` and the page flies to
 * the section and answers. The whole mechanism rests on one property — that the question a
 * card asks routes to the card's own memory — and that property is a pure function of the
 * corpus and the retriever, so it can be asserted here rather than discovered by a visitor.
 *
 * It is exactly the kind of thing that rots quietly. A memory retitled for editorial reasons,
 * a new alias, a corpus that grows until two titles collide: any of those breaks a card
 * without breaking a test, and the failure is invisible from the outside because the page
 * still answers something. This is the test that notices.
 *
 * `viewing` is set because a card click guarantees it — the visitor is looking at the section
 * the card is in, and `prepareSendMessagesRequest` reads that off `<html data-stop>` on every
 * question. Asserting without it would be testing a case that cannot happen.
 */
import { describe, expect, it } from 'vitest';
import { loadMemories } from '../../lib/corpus/load';
import { cardQuestion } from '../../lib/card-question';
import { retrieve } from '../../lib/retrieve';

/** The sections `StopSection` draws as cards, plus contact, which draws all of its own. */
const CARD_SECTIONS = new Set(['projects', 'capabilities', 'timeline', 'contact']);

const cardable = loadMemories().filter((m) => CARD_SECTIONS.has(m.section));

describe('a card is a question that has not been asked yet', () => {
  it('has cards to test', () => {
    expect(cardable.length).toBeGreaterThanOrEqual(14);
  });

  it('routes every card question to the card’s own stop', () => {
    const wrong = cardable.flatMap((m) => {
      const r = retrieve(cardQuestion(m.title), { viewing: m.stopId });
      if (r.stopId === m.stopId) return [];
      return [`  ${JSON.stringify(m.title)} (${m.id}) -> ${r.stopId}, want ${m.stopId}`];
    });
    expect(wrong, `card questions landed on the wrong stop:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('puts the card’s own memory first', () => {
    /*
     * Rank 0, not merely present. The pressed card becomes `cites[0]`, and §07's figure and
     * the answer's dek both read the first cite — so a card whose memory came back second
     * would produce an answer about something else beside a picture of something else again.
     */
    const wrong = cardable.flatMap((m) => {
      const r = retrieve(cardQuestion(m.title), { viewing: m.stopId });
      const top = r.hits[0]?.memory.id;
      if (top === m.id) return [];
      return [`  ${JSON.stringify(m.title)} (${m.id}) -> ${top ?? 'nothing'}`];
    });
    expect(wrong, `card questions did not rank their own memory first:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('is never refused', () => {
    // `topical` is the field the handler branches on. A card that is on the page and gets
    // "Not my lane" is the worst version of this feature.
    const refused = cardable.flatMap((m) => {
      const r = retrieve(cardQuestion(m.title), { viewing: m.stopId });
      return r.topical ? [] : [`  ${JSON.stringify(m.title)} (${m.id})`];
    });
    expect(refused, `card questions came back as refusals:\n${refused.join('\n')}`).toEqual([]);
  });

  it('reads as a question, not as a database key', () => {
    // The phrasing exists for `AnswerBlock`'s ASKED line, which prints it back to the visitor.
    expect(cardQuestion('AI agents')).toBe('Tell me about AI agents.');
  });
});
