/**
 * The router, judged on its misses.
 *
 * This site decides which of the twelve stops a question belongs to BEFORE the model speaks:
 * the camera starts flying at ~10 ms on the strength of `lib/retrieve.ts` alone. So the
 * retriever is not scored here on whether it found something relevant -- retrieval.test.ts
 * does that -- but on whether it found the RIGHT PLACE. A router that is right about the
 * memory and wrong about the stop sends a visitor to a section that cannot answer them,
 * confidently, with a camera move.
 *
 * The table lives in routing-table.ts because `scripts/route-eval.ts` prints the same rows
 * with scores. Read that output before touching a threshold or an alias.
 *
 * Two assertions, and they pull against each other on purpose: be right about real
 * questions, and be quiet about questions this corpus cannot answer. Either one is trivial
 * to pass alone -- route everything to `now`, or refuse everything.
 */
import { describe, expect, it } from 'vitest';
import { ANSWERABLE_STOP_IDS } from '../../content/stops';
import { MIN_TOP_SCORE, retrieve, routeQuestion } from '../../lib/retrieve';
import {
  BUYER_QUESTIONS,
  MIN_ACCURACY,
  OFFER_STOPS,
  OFF_TOPIC_QUESTIONS,
  ROUTING_TABLE,
  TERSE_QUESTIONS,
} from './routing-table';

describe('the routing table', () => {
  it('covers every answerable stop, and no unanswerable one', () => {
    const covered = new Set(ROUTING_TABLE.map((row) => row.stopId));
    for (const stop of ANSWERABLE_STOP_IDS) {
      expect([...covered], `no routing case exercises the "${stop}" stop`).toContain(stop);
    }
    // `hero` is authored copy. Nothing generated may target it, so nothing may expect it.
    expect(covered.has('hero')).toBe(false);
    expect(ROUTING_TABLE.length).toBeGreaterThanOrEqual(30);
  });

  it(`routes at least ${(MIN_ACCURACY * 100).toFixed(0)}% of real questions to the right stop`, () => {
    const misses = ROUTING_TABLE.flatMap((row) => {
      const result = retrieve(row.question);
      if (result.stopId === row.stopId) return [];
      return [
        `  ${JSON.stringify(row.question)}\n` +
          `      want ${row.stopId}, got ${result.stopId} ` +
          `(confident=${result.confident}, top=${result.topScore.toFixed(1)})\n` +
          `      hits: ${result.hits.map((h) => `${h.memory.stopId}/${h.memory.id}@${h.score.toFixed(1)}`).join(', ')}`,
      ];
    });

    const accuracy = (ROUTING_TABLE.length - misses.length) / ROUTING_TABLE.length;
    expect(
      accuracy,
      `routing accuracy ${(accuracy * 100).toFixed(1)}% over ${ROUTING_TABLE.length} questions ` +
        `(${misses.length} misrouted)\n${misses.join('\n')}\n` +
        'Run `npm run route:eval` for the full table with scores.',
    ).toBeGreaterThanOrEqual(MIN_ACCURACY);
  });

  it('is confident about the questions it gets right', () => {
    // Correct-but-hedged is a real state and a useful one, but it should be the exception.
    // If most of the table is unconfident the threshold is miscalibrated, not cautious.
    const hedged = ROUTING_TABLE.filter((row) => {
      const result = routeQuestion(row.question);
      return result.stopId === row.stopId && !result.confident;
    });
    expect(
      hedged.length / ROUTING_TABLE.length,
      `${hedged.length} correctly-routed questions came back unconfident:\n` +
        hedged.map((row) => `  ${JSON.stringify(row.question)}`).join('\n'),
    ).toBeLessThanOrEqual(0.1);
  });
});

describe('questions this site cannot answer', () => {
  it('refuses to answer them confidently', () => {
    const loud = OFF_TOPIC_QUESTIONS.flatMap((question) => {
      const result = retrieve(question);
      if (!result.confident) return [];
      return [`  ${JSON.stringify(question)} -> ${result.stopId} (top=${result.topScore.toFixed(1)})`];
    });
    expect(
      loud,
      'off-topic questions came back confident -- the route would answer them with a straight face:\n' +
        loud.join('\n'),
    ).toEqual([]);
  });

  it('still names a best stop, so the route can degrade rather than dead-end', () => {
    // "not confident" must not mean "no information". The route may still fly the camera
    // and hedge the copy; what it may not do is claim the stop is right.
    const result = retrieve('write my essay');
    expect(result.confident).toBe(false);
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.stopId).not.toBeNull();
  });
});

describe('the field the handler actually reads', () => {
  /*
   * THE HOLE THIS CLOSES. Every assertion above this one reads `stopId` or `confident`.
   * `lib/ask/handler.ts` reads NEITHER -- it refuses on `!topical`, a third field nothing
   * in this file had ever looked at. So the suite could print 64/64 = 100% while the live
   * site answered "Not my lane. Ask what I've built." to "can i get your cv", which is one
   * of those 64. It routed to `contact` correctly and was refused on the way out.
   *
   * A test that does not assert the value the caller branches on is decoration.
   */
  it('finds every question in the table topical, because that is what decides a refusal', () => {
    const refused = ROUTING_TABLE.flatMap((row) => {
      const result = retrieve(row.question);
      if (result.topical) return [];
      return [`  ${JSON.stringify(row.question)} -> refused (top=${result.topScore.toFixed(1)}, stop=${result.stopId})`];
    });
    expect(
      refused,
      'questions in the routing table come back as refusals -- the site would tell a real ' +
        'visitor "Not my lane":\n' + refused.join('\n'),
    ).toEqual([]);
  });

  it('finds none of the off-topic questions topical', () => {
    const admitted = OFF_TOPIC_QUESTIONS.flatMap((question) => {
      const result = retrieve(question);
      return result.topical ? [`  ${JSON.stringify(question)} -> ${result.stopId}`] : [];
    });
    expect(admitted, `off-topic questions were admitted:\n${admitted.join('\n')}`).toEqual([]);
  });
});

/*
 * THE SECOND HOLE, and it is the same shape as the first: the suite could print 77/77 while
 * the site answered "I do not know that one" to a visitor who typed one word.
 *
 * Every row of ROUTING_TABLE is a sentence. A raw BM25+ score is a sum over matched terms,
 * so a table of sentences calibrates a threshold a one-word question cannot reach, however
 * the threshold is set. MEASURED 2026-09-06: `brunel` retrieved `education` FIRST -- right
 * memory, right stop -- scored 12.7 against a MIN_TOP_SCORE of 16, and was refused, while
 * `what did you study` retrieves the same memory at 126.0.
 *
 * These rows assert `topical`, not merely `stopId`, because `topical` is what the handler
 * branches on and the routing was never the thing that was wrong.
 */
describe('a visitor who types one word', () => {
  it('is answered, and about the thing they named', () => {
    const wrong = TERSE_QUESTIONS.flatMap(({ question, stopId }) => {
      const result = retrieve(question);
      if (result.stopId === stopId && result.topical) return [];
      const why = result.stopId !== stopId ? `routed to ${result.stopId}` : 'refused';
      return [
        `  ${JSON.stringify(question)} -> ${why} ` +
          `(raw ${result.topScore.toFixed(1)}, per term ${result.perTermScore.toFixed(2)})`,
      ];
    });
    expect(wrong, `terse questions the site would turn away:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('is the low end of the band, or it is not testing anything', () => {
    // If every terse row cleared MIN_TOP_SCORE on its own, this set would be exercising the
    // raw threshold and MIN_PER_TERM_SCORE would be untested by it.
    const needTheClause = TERSE_QUESTIONS.filter((row) => retrieve(row.question).topScore < MIN_TOP_SCORE);
    expect(needTheClause.length).toBeGreaterThanOrEqual(3);
  });
});

describe('the questions that pay for this site', () => {
  it('answers every one of them', () => {
    const refused = BUYER_QUESTIONS.flatMap((question) => {
      const result = retrieve(question);
      if (result.topical) return [];
      return [`  ${JSON.stringify(question)} (top=${result.topScore.toFixed(1)}, stop=${result.stopId})`];
    });
    expect(
      refused,
      `${refused.length} buying enquiries were refused. Each of these is a visitor with a ` +
        'budget being told to go away:\n' + refused.join('\n'),
    ).toEqual([]);
  });

  it('sends them somewhere that can take a brief', () => {
    const strays = BUYER_QUESTIONS.flatMap((question) => {
      const { stopId } = retrieve(question);
      if (stopId && (OFFER_STOPS as readonly string[]).includes(stopId)) return [];
      return [`  ${JSON.stringify(question)} -> ${stopId}`];
    });
    expect(
      strays,
      'buying enquiries were flown to a section that cannot take a brief:\n' + strays.join('\n'),
    ).toEqual([]);
  });
});
