/**
 * The site never promises anything it has no way to do.
 *
 * THE ARCHITECTURAL HOLE THIS FILLS, stated plainly because it is not obvious from any
 * other file: `lib/grounding/guard.ts` catches `unlicensed-quantity`, `unknown-entity` and
 * `mispaired-quantity`, and every one of those checks a sentence against the corpus, which
 * is a record of things that have already happened. **A commitment is a claim about the
 * future.** There is nothing for it to be checked against, so it passes -- verified, in the
 * page's own words -- and the visitor is told something untrue by the one part of this site
 * that advertises being checked.
 *
 * It is not a hypothetical. MJK proposed the sentence himself: *"if not can say something
 * like 'i'm not sure about this but i'll check and get back to you'"*. It is warmer than a
 * refusal and it is the obvious thing to write. It is also false in every particular:
 * nothing typed into the dock reaches an inbox, nothing is recorded, nobody reads the
 * question afterwards, and no mechanism exists that could make it true. The decision that
 * came out of it (`DIRECTION.md` 7) is to say what is true instead -- "I do not know that
 * one, and I am not going to guess. It is better put to me directly." -- and that sentence
 * is one edit away from becoming the promise at any point in the future. This is the edit
 * that fails.
 *
 * WHAT IT READS, and each of the three is here for a different reason:
 *
 *   `authoredCopy()` -- every sentence a human typed that a visitor can read, which now
 *   includes `lib/fallback.ts` (the words shown when no model spoke) and
 *   `content/system-prompt.md` (the instructions for when one does). The prompt is the
 *   dangerous one: an instruction to offer a follow-up would be obeyed on every unanswerable
 *   question, in the first person, and nothing downstream would object.
 *
 *   The rendered fallback blocks -- because a fallback body is corpus prose assembled at
 *   runtime, and a scanner that only reads source would never see the sentence a visitor is
 *   actually shown.
 *
 *   `content/memories.yaml` -- the one file `authoredCopy()` deliberately refuses to police
 *   for claims, on the grounds that it IS the licence. Promises are the exception, and the
 *   asymmetry is the point: no memory can license a commitment, because a memory is a record
 *   of the past and the site has no way to keep a commitment whatever its provenance. A
 *   memory that promised a reply would be printed verbatim, as an answer, under a heading
 *   saying it had been checked.
 *
 * The patterns are shaped rather than lexical -- anchored on a first-person modal, or on an
 * idiom that has no innocent reading -- so this file can name what it forbids and the prompt
 * can ban it in the second person without either tripping the other.
 */
import { describe, expect, it } from 'vitest';
import { ANSWERABLE_STOP_IDS } from '../../content/stops';
import { loadMemories } from '../../lib/corpus/load';
import { fallbackBlock, type FallbackReason } from '../../lib/fallback';
import { authoredCopy } from './authored-copy';

/**
 * Commitment language, with what to write instead. The `instead` field matters more here
 * than in most guards: every one of these is a phrase a decent writer reaches for because
 * it is kinder than the truth, so a failure that only said "banned" would read as pedantry.
 */
const COMMITMENTS: { pattern: RegExp; why: string }[] = [
  {
    pattern: /\bget back to (?:you|him|them)\b/i,
    why: 'there is no inbox behind the dock. Say "It is better put to me directly" and let §08 do the rest.',
  },
  {
    pattern:
      /\b(?:i|we)\s*(?:'|’)?(?:ll|will|shall|can|could|am going to|are going to)\s+(?:go\s+)?(?:and\s+)?(?:check|find out|look into|look that up|ask|confirm|verify|dig into)\b/i,
    why: 'a promise to go and find out. Nobody goes, and nothing comes back. Say what is known and stop.',
  },
  {
    pattern: /\blet me (?:check|find out|look into|look that up|ask|confirm|go and)\b/i,
    why: 'the same promise in the imperative. There is no second turn in which to keep it.',
  },
  {
    pattern:
      /\b(?:i|we)\s*(?:'|’)?(?:ll|will|shall)\s+(?:follow up|revert|update you|let you know|come back to you|send|share|email|forward)\b/i,
    why: 'a commitment to a reply that no part of this system can deliver.',
  },
  {
    pattern: /\brevert to you\b|\bcircle back\b|\bwatch this space\b/i,
    why: 'the same promise as an idiom. It is no more keepable for being a stock phrase.',
  },
  {
    pattern: /\bkeep you (?:posted|updated|in the loop)\b/i,
    why: 'nothing is stored against a visitor, so there is nobody to keep posted.',
  },
  {
    pattern: /\b(?:be|get) in touch (?:with you\s+)?(?:shortly|soon)\b/i,
    why: 'a promise with a deadline on it. The contact links are the offer; the visitor makes the move.',
  },
  {
    pattern: /\bshortly\b|\bcoming soon\b/i,
    why: 'a claim about when. Every guard in this repo checks the past; a time is a claim about the future.',
  },
  {
    /*
     * The timing words that DO have an innocent reading, so they are only a violation when
     * something commits to them. `ChatDock`'s transport-failure line is "Ask again in a
     * moment.", which is the opposite of a promise -- it hands the next move to the visitor
     * and binds the site to nothing -- and a bare /in a moment/ called it a violation. The
     * pattern was wrong, not the copy.
     */
    pattern:
      /\b(?:i|we)\s*(?:'|’)?(?:ll|will|shall|am|are)\b[^.!?]{0,60}?\b(?:soon|in a moment|in a bit|by tomorrow|next week|by the end of (?:the )?(?:day|week))\b/i,
    why: 'a commitment with a clock on it. Nothing here can be delivered at any time at all.',
  },
];

/** Every string the site can put in front of a visitor, with where it came from. */
function visitorText(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];

  for (const { file, lines } of authoredCopy()) {
    for (const text of lines) out.push({ where: file, text });
  }

  const REASONS: FallbackReason[] = ['budget', 'rate', 'off-topic', 'unknown', 'provider', 'unguarded'];
  for (const stopId of ANSWERABLE_STOP_IDS) {
    for (const reason of REASONS) {
      const block = fallbackBlock(stopId, reason);
      for (const [field, text] of [
        ['kicker', block.kicker ?? ''],
        ['title', block.title],
        ['body', block.body],
      ] as const) {
        if (text.trim()) out.push({ where: `fallback ${reason} on ${stopId} (${field})`, text });
      }
    }
  }

  for (const m of loadMemories()) {
    out.push({ where: `content/memories.yaml ${m.id}`, text: `${m.title} ${m.body}` });
  }

  return out;
}

const TEXT = visitorText();

describe('nothing the site says commits it to something it cannot do', () => {
  it('is actually reading the three sources', () => {
    // Named, not counted. A refactor that dropped the prompt or the fallback from
    // `authoredCopy()` would leave this file green while guarding the two places a promise
    // is most likely to be written.
    const wheres = TEXT.map((t) => t.where);
    expect(wheres).toContain('content/system-prompt.md');
    expect(wheres).toContain('lib/fallback.ts');
    expect(wheres.some((w) => w.startsWith('fallback unknown on'))).toBe(true);
    expect(wheres.some((w) => w.startsWith('content/memories.yaml'))).toBe(true);
    expect(TEXT.length).toBeGreaterThan(200);
  });

  it.each(COMMITMENTS)('never says $pattern', ({ pattern, why }) => {
    const hits = TEXT.filter((t) => pattern.test(t.text));
    expect(
      hits,
      `${hits.map((h) => `\n  ${h.where}\n    "${h.text}"`).join('')}\n  → ${why}\n`,
    ).toEqual([]);
  });

  it('says, somewhere, what to do instead of promising', () => {
    /*
     * The ban is only half a rule. A refusal that says nothing at all is not what decision 7
     * asked for -- it asked for a person who does not know, which means the sentence has to
     * end somewhere the visitor can go. If this ever fails, the copy has been pared past the
     * point of being useful and the guard above is the only thing left.
     */
    const refusal = fallbackBlock('now', 'unknown').title;
    expect(refusal).toMatch(/directly/i);
    expect(refusal.length, 'the refusal has been cut down to a shrug').toBeGreaterThan(40);
  });
});

/**
 * The guard is worth having only if it still bites, and the fixture is the exact sentence
 * that was proposed for the site. Every entry above is proved against copy that a
 * well-meaning author would plausibly write.
 */
describe('the promise guard still bites', () => {
  const CANDIDATES: [string, string][] = [
    ['the sentence that was proposed', "I'm not sure about this but I'll check and get back to you."],
    ['the same thing, uncontracted', 'I do not have that to hand. I will find out and let you know.'],
    ['the polite version', 'Let me check with the client and revert to you.'],
    ['the timed version', 'I do not know that one. I will confirm it shortly.'],
    ['the deferred version', 'That detail is coming soon — I can look into it and email you.'],
    ['an instruction rather than an answer', 'If the material is thin, offer that we will follow up with them.'],
    ['a commitment with a clock on it', 'I do not have that yet. I will have something for you by tomorrow.'],
  ];

  it.each(CANDIDATES)('catches %s', (_name, sentence) => {
    const caught = COMMITMENTS.filter((c) => c.pattern.test(sentence));
    expect(caught.length, `nothing in COMMITMENTS matched: "${sentence}"`).toBeGreaterThan(0);
  });

  it('leaves the refusal that replaced them alone', () => {
    // The whole point. This sentence admits the gap, points somewhere real, and promises
    // nothing -- if a pattern above ever starts matching it, the pattern is wrong.
    const shipped = 'I do not know that one, and I am not going to guess. It is better put to me directly.';
    expect(COMMITMENTS.filter((c) => c.pattern.test(shipped))).toEqual([]);
  });

  it('leaves MJK’s own writing about how he works alone', () => {
    // A description of past work is not a promise, and a guard that cannot tell the
    // difference would start editing the corpus.
    for (const innocent of [
      'I ran beta programs with product and account teams and built the training that took it all to sales.',
      'The pipeline halts and asks a person when a gate fails, and I check the output before it ships.',
      'Soon after the launch the market moved, and the plan moved with it.',
      // ChatDock's transport-failure line. It hands the next move to the visitor, which is
      // the shape of every honest sentence in this file.
      'Ask again in a moment.',
    ]) {
      expect(COMMITMENTS.filter((c) => c.pattern.test(innocent)), innocent).toEqual([]);
    }
  });
});
