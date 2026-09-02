/**
 * The router, judged on its misses.
 *
 * This site decides which of the nine stops a question belongs to BEFORE the model speaks:
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
import { retrieve, routeQuestion } from '../../lib/retrieve';
import { MIN_ACCURACY, OFF_TOPIC_QUESTIONS, ROUTING_TABLE } from './routing-table';

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
