/**
 * The site talks about MJK, never about itself.
 *
 * This guards a defect class that shipped three times in one week, each time caught by
 * the owner reading his own live site rather than by anything in this repo:
 *
 *   1. "Checked against the corpus." under every answer. Nobody outside this repo knows
 *      what a corpus is, and announcing a check on every answer plants a doubt that was
 *      not there.
 *   2. Raw memory ids rendered as citation chips -- `[project-taboola]` on a portfolio.
 *   3. Fallback answers that apologised for themselves. He asked why he wanted to fly,
 *      got his own account of the cockpit at nine years old -- a complete answer to
 *      exactly the question -- under the heading "That is too many, too fast. Here is
 *      what it would have said." The site was disparaging its own best writing.
 *
 * All three are the same mistake: copy written from the system's point of view and
 * shipped to a reader who has no idea the system exists. The rule is that the machinery
 * is named in exactly one place, `app/privacy/page.tsx`, where a visitor has gone
 * looking for it. Everywhere else the site is a person answering questions.
 *
 * Deliberately NOT enforced here: "the mind". It is the site's central metaphor, used
 * consistently and on purpose, and a metaphor is not jargon.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANSWERABLE_STOP_IDS, STOPS } from '../../content/stops';
import { suggestedPrompts } from '../../content/static-copy';
import { cardKicker } from '../../components/stops/card-kicker';
import { loadMemories } from '../../lib/corpus/load';
import { fallbackBlock } from '../../lib/fallback';

/**
 * Words that only mean something to someone who has read this repository. Each entry
 * pairs the pattern with what a visitor would actually be told instead, so a failure
 * teaches rather than just refuses.
 */
const MACHINERY: { pattern: RegExp; why: string }[] = [
  { pattern: /\bcorpus\b/i, why: 'say what it is -- "what he has written down" -- or say nothing.' },
  { pattern: /\bthe dock\b/i, why: 'a visitor does not know a "dock" is. Point at it plainly: "ask below".' },
  { pattern: /\bthe stop\b|\bthis stop\b/i, why: '"stop" is our word for a section of the page, not theirs.' },
  { pattern: /\bmemor(y|ies)\b/i, why: 'the storage layer is not the reader\'s concern.' },
  { pattern: /\bretriev(al|ed|es)\b/i, why: 'internal vocabulary.' },
  { pattern: /\benvelope\b/i, why: 'internal vocabulary.' },
  { pattern: /\bfallback\b/i, why: 'internal vocabulary.' },
  { pattern: /\bgrounding\b|\bthe guard\b/i, why: 'internal vocabulary.' },
  { pattern: /would have said/i, why: 'never apologise for an answer that is true. Just answer.' },
  { pattern: /\bchecked against\b/i, why: 'do not advertise the check. Silence is the signal for a good answer.' },
  { pattern: /\bunder this paragraph\b/i, why: 'do not narrate the layout; it also stops being true when it changes.' },
  { pattern: /^cta$/i, why: 'a marketing word for the card, printed above the card, to the person it is aimed at.' },
];

/** Every string a visitor can read that this repo authors, with where it came from. */
function visitorCopy(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];

  for (const stop of STOPS) {
    const title: { strong: string; muted?: string } = stop.title;
    out.push({ where: `stops.ts ${stop.id} kicker`, text: stop.kicker });
    out.push({ where: `stops.ts ${stop.id} title`, text: `${title.strong} ${title.muted ?? ''}` });
    out.push({ where: `stops.ts ${stop.id} body`, text: stop.body });
  }

  for (const p of suggestedPrompts) out.push({ where: 'static-copy suggestedPrompts', text: p });

  // Fallback titles and kickers are authored here; bodies are corpus prose and exempt,
  // because MJK's own writing is allowed to use any word he likes.
  for (const stopId of ANSWERABLE_STOP_IDS) {
    for (const reason of ['budget', 'rate', 'off-topic', 'provider', 'unguarded'] as const) {
      const block = fallbackBlock(stopId, reason);
      if (block.kicker) out.push({ where: `fallback ${reason} kicker`, text: block.kicker });
      // An unannounced block's title is a memory title, i.e. MJK's, so only check ours.
      if (block.announced) out.push({ where: `fallback ${reason} title`, text: block.title });
    }
  }

  /*
   * Card eyebrows. These are derived from the corpus rather than authored, which is
   * exactly why they were missed: the rule below was only ever reading `stops.ts` and the
   * fallbacks, so when a card fell back to a memory's first tag the word "CTA" printed
   * above both cards on §08 — the conversion screen — and no test had anything to say
   * about it. A derived string a visitor reads is visitor copy.
   */
  for (const m of loadMemories()) {
    out.push({ where: `card kicker for ${m.id}`, text: cardKicker(m) });
  }

  const notFound = readFileSync(join(process.cwd(), 'app', 'not-found.tsx'), 'utf-8');
  for (const m of notFound.matchAll(/>([^<>{}]{12,})</g)) {
    out.push({ where: 'app/not-found.tsx', text: m[1].trim() });
  }

  return out.filter((c) => c.text.trim().length > 0);
}

describe('visitor-facing copy never explains the machine', () => {
  const copy = visitorCopy();

  it('is actually reading the copy', () => {
    expect(copy.length).toBeGreaterThan(25);
  });

  it.each(MACHINERY)('never says $pattern', ({ pattern, why }) => {
    const hits = copy.filter((c) => pattern.test(c.text));
    expect(
      hits,
      `${hits.map((h) => `\n  ${h.where}\n    "${h.text}"`).join('')}\n  → ${why}\n`,
    ).toEqual([]);
  });

  /*
   * Below 768px the dock shows one suggestion at a time, in a row 272px wide at the
   * narrowest phone. A suggestion that wraps there makes the row two lines, which
   * republishes `--dock-h`, which relays out all nine sections — in the middle of a
   * cross-fade. 40 characters is the measured budget at 14px Inter, and the guard is here
   * rather than in CSS because the copy is the fix and the clipping is only the net.
   */
  it('keeps every suggestion to one line on the narrowest phone', () => {
    for (const p of suggestedPrompts) {
      expect(p.length, `"${p}" is ${p.length} characters and will wrap at 320px`).toBeLessThanOrEqual(40);
    }
  });

  it('lets the privacy page name the machinery, because that is what it is for', () => {
    const privacy = readFileSync(join(process.cwd(), 'app', 'privacy', 'page.tsx'), 'utf-8');
    // If this ever stops being true the rule above has quietly become a gag order rather
    // than a style, and the site would have nowhere honest to explain itself.
    expect(privacy).toMatch(/OpenRouter|rate limit|Redis/i);
  });
});
