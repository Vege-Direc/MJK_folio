/**
 * The section on screen, used to work out what a question is about.
 *
 * THE INCIDENT. MJK asked about the Paxel report, which answered on `work`. He scrolled to
 * section six and asked "can you give me more details on these systems?" and was answered
 * about the Paxel report. Two things were wrong and only one of them was retrieval:
 *
 *   1. The question tokenises to almost nothing -- "these" is a stopword, "detail" appears
 *      in no memory, "system" in twelve -- so retrieval had no subject to find.
 *   2. The previous answer sat in the prompt as a full `assistant` turn, thousands of
 *      characters of it, in the slot a model weights most heavily. It won.
 *
 * The guard could not catch it: every proper noun and every number in that answer was
 * real. It checks whether a claim is true, not whether it is on the subject.
 *
 * The risk in fixing it is the opposite failure -- dragging someone parked on section six
 * to section six when they ask a specific question about section two. That is why test A
 * is exhaustive and exact rather than a percentage: 95% would mean one visitor in twenty
 * silently gets the old bug back.
 */
import { describe, expect, it } from 'vitest';
import { ANSWERABLE_STOP_IDS } from '../../content/stops';
import { retrieve } from '../../lib/retrieve';
import { ROUTING_TABLE } from './routing-table';

/** Questions whose subject is on the screen rather than in their words. */
const DEICTIC = [
  'can you give me more details on these systems?',
  'tell me more about this',
  'more on that',
  'what else?',
  'can you expand on this',
  'and these?',
  'go on',
  'tell me more',
  'what about them',
  'elaborate on this please',
  'why does that matter',
  'how did that work',
];

/** Questions that name their own subject, however many demonstratives they contain. */
const ANCHORED = ['was this the RD 350?', 'more on tallybridge', 'what about taboola at that time'];

describe('A. the viewport never moves a question that stands on its own', () => {
  it('routes all 62 questions identically from every one of the 8 sections', () => {
    const drift: string[] = [];
    for (const { question } of ROUTING_TABLE) {
      const alone = retrieve(question).stopId;
      for (const viewing of ANSWERABLE_STOP_IDS) {
        const withView = retrieve(question, { viewing }).stopId;
        if (withView !== alone) drift.push(`"${question}" viewing ${viewing}: ${alone} -> ${withView}`);
      }
    }
    // Exact, not a ratio. A specific question must reach its own subject from anywhere on
    // the page, or the feature has traded one silent wrong answer for another.
    expect(drift, `the viewport dragged a self-contained question:\n  ${drift.join('\n  ')}`).toEqual([]);
  });
});

describe('B. a question that points is answered about what is on screen', () => {
  it('lands on the section being read, from every section', () => {
    const misses: string[] = [];
    for (const question of DEICTIC) {
      for (const viewing of ANSWERABLE_STOP_IDS) {
        const r = retrieve(question, { viewing });
        if (r.stopId !== viewing) misses.push(`"${question}" viewing ${viewing} -> ${r.stopId}`);
      }
    }
    expect(misses, `pointing questions that went elsewhere:\n  ${misses.join('\n  ')}`).toEqual([]);
  });

  it('refuses none of them', () => {
    // Before the viewport existed, most of these scored near zero and were shown the
    // refusal written for people asking the site to do their homework.
    const refused = DEICTIC.flatMap((question) =>
      ANSWERABLE_STOP_IDS.filter((viewing) => !retrieve(question, { viewing }).topical).map(
        (viewing) => `"${question}" viewing ${viewing}`,
      ),
    );
    expect(refused).toEqual([]);
  });

  it('hands the model the memories of the section being read', () => {
    // Routing to the right section while passing the wrong section's memories is the
    // original defect in a new hat: the reader is taken to six, the model still holds seven.
    const r = retrieve('can you give me more details on these systems?', { viewing: 'now' });
    expect(r.grounded).toBe(true);
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits.slice(0, 3).every((h) => h.memory.stopId === 'now')).toBe(true);
  });

  it('answers a question made entirely of stopwords, which used to return nothing at all', () => {
    const r = retrieve('tell me more', { viewing: 'rd350' });
    expect(r.stopId).toBe('rd350');
    expect(r.topical).toBe(true);
    expect(r.context.length).toBeGreaterThan(0);
  });
});

describe('C. the viewport is not a way past the refusal', () => {
  it('still refuses a request to do the visitor\'s own work, from every section', () => {
    for (const viewing of ANSWERABLE_STOP_IDS) {
      expect(retrieve('review my code', { viewing }).topical, `viewing ${viewing}`).toBe(false);
      expect(retrieve('translate this to french', { viewing }).topical, `viewing ${viewing}`).toBe(false);
    }
  });

  it('documents the pronoun questions it does answer, so the list cannot grow unnoticed', () => {
    // "is it going to rain" contains a pronoun, names nothing, and scores low, so it looks
    // exactly like a follow-up. The site answers truthfully about the section on screen
    // rather than about the weather, which is odd but harmless -- and strictly better than
    // the alternative, which is refusing genuine follow-ups to avoid it. Pinned here so
    // that if the set of questions with this shape grows, this test says so.
    const known = ['is it going to rain', 'can you do that for me'];
    for (const q of known) expect(retrieve(q, { viewing: 'now' }).topical).toBe(true);
  });
});

describe('D. naming a subject beats standing in front of one', () => {
  it.each(ANCHORED)('"%s" ignores the viewport', (question) => {
    const alone = retrieve(question).stopId;
    for (const viewing of ANSWERABLE_STOP_IDS) {
      expect(retrieve(question, { viewing }).stopId, `viewing ${viewing}`).toBe(alone);
    }
  });
});
