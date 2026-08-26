/**
 * Retrieval, and the two-letter word that breaks it.
 *
 * `lib/rag.ts:30` filters query tokens with `w.length > 2`. That silently drops `ai`
 * — the single highest-value query term on this site, and a word in one of the four
 * prompts we ship in `content/static-copy.ts` ("Show me the AI work."). Ask the site
 * about AI and the retriever hands the model nothing; the model answers from thin air.
 * That is the exact machinery that produces a fabrication.
 *
 * The two tests below are `it.fails` on purpose. They run, they assert, and they are
 * marked as expected-to-fail, so CI is green today while the defect stays named and
 * visible in the test output. `it.skip` was the other option and is worse: a skip is
 * silent forever, and nothing ever forces someone to look at it again.
 *
 * `it.fails` expires itself. The moment step 9 lands the rewritten retriever and these
 * assertions start passing, the `.fails` marker turns the test red and whoever did the
 * rewrite has to come here and delete the marker. A TODO that cannot rot.
 *
 * TODO(step-9): rewrite lib/rag.ts, then drop `.fails` from both tests below.
 */
import { describe, expect, it } from 'vitest';
import { suggestedPrompts } from '../../content/static-copy';
import { retrieveMemories } from '../../lib/rag';

/** Short, and the most meaningful thing a visitor can type. */
const SHORT_BUT_MEANINGFUL = ['ai', '3d', 'ux'];

describe('query tokenisation', () => {
  // TODO(step-9): lib/rag.ts must export `tokenize(query: string): string[]`.
  // Today it has no such export — the filter is inline at line 30 and cannot be
  // tested, which is half of why the bug survived. Drop `.fails` once it exists.
  it.fails('preserves short but meaningful terms', async () => {
    const mod = (await import('../../lib/rag')) as Record<string, unknown>;
    expect(typeof mod.tokenize).toBe('function');

    const tokenize = mod.tokenize as (q: string) => string[];
    const tokens = tokenize('Show me the AI work — 3D scenes and UX.');
    for (const term of SHORT_BUT_MEANINGFUL) {
      expect(tokens, `"${term}" was dropped by the tokeniser`).toContain(term);
    }
  });
});

describe('retrieval', () => {
  // The whole defect in one line. `ai` is two characters, so `w.length > 2` throws it
  // away, every memory scores 0, and the retriever returns an empty string.
  it.fails('finds the AI memories for the query "ai"', async () => {
    const hits = await retrieveMemories('ai');
    expect(hits, 'retrieving "ai" returned nothing').not.toBe('');
    expect(hits.toLowerCase()).toContain('agents');
  });

  // Passes today, and only by luck: "Show me the AI work." clears zero on the word
  // "the", which matches nearly every memory, not on "ai", which never survives the
  // filter. Keep this test anyway — it is the forward guard. Any step-9 rewrite that
  // adds stopword removal without also fixing the length filter takes that prompt
  // straight to zero, and this is what catches it.
  it('returns at least one memory for every prompt we suggest', async () => {
    expect(suggestedPrompts.length).toBe(4);

    for (const prompt of suggestedPrompts) {
      const hits = await retrieveMemories(prompt);
      expect(hits, `no memory retrieved for a prompt we ship: "${prompt}"`).not.toBe('');
      expect(hits, `malformed retrieval block for "${prompt}"`).toMatch(/^\[[a-z]+\/[a-z0-9-]+\]/);
    }
  });
});
