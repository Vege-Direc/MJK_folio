/**
 * Retrieval, and the two-letter word that used to break it.
 *
 * `lib/rag.ts:30` filtered query tokens with `w.length > 2`. That silently dropped `ai` --
 * the single highest-value query term on this site, and a word in one of the four prompts
 * we ship in `content/static-copy.ts` ("Show me the AI work."). Ask the site about AI and
 * the retriever handed the model nothing; the model then answered from thin air. That is
 * the exact machinery that produces a fabrication.
 *
 * These tests were `it.fails` markers against that defect until `lib/retrieve.ts` replaced
 * it. The markers are gone because the assertions pass; the assertions stay because the
 * defect class does not. Anyone who adds stopword handling, a stemmer or a length filter to
 * the tokenizer meets these three again.
 *
 * Routing -- which stop a question flies the camera to -- is asserted next door in
 * routing.test.ts. This file is only about whether the right memories come back at all.
 */
import { describe, expect, it } from 'vitest';
import { suggestedPrompts } from '../../content/static-copy';
import { retrieve, retrieveMemories, tokenize } from '../../lib/retrieve';

/** Short, and the most meaningful things a visitor can type here. */
const SHORT_BUT_MEANINGFUL = ['ai', '3d', 'ux'];

describe('query tokenisation', () => {
  it('preserves short but meaningful terms', () => {
    const tokens = tokenize('Show me the AI work — 3D scenes and UX.');
    for (const term of SHORT_BUT_MEANINGFUL) {
      expect(tokens, `"${term}" was dropped by the tokeniser`).toContain(term);
    }
  });

  it('keeps the domain words a light stopword list is always tempted to eat', () => {
    // Each of these names something on this site: the Selected work stop, the Now stop,
    // the contact CTA, and two verbs the corpus uses about itself.
    const tokens = tokenize('what work are you doing now, and what did you build and ship? brief me');
    for (const term of ['work', 'now', 'build', 'ship', 'brief']) {
      expect(tokens, `"${term}" was treated as a stopword`).toContain(term);
    }
  });

  it('strips punctuation and normalises plurals against the same tokeniser the index uses', () => {
    expect(tokenize('Agents, agents — "agents"!')).toEqual(['agent', 'agent', 'agent']);
  });
});

describe('retrieval', () => {
  // The whole original defect in one line: `ai` is two characters, so `w.length > 2` threw
  // it away, every memory scored 0, and the retriever returned an empty string.
  it('finds the AI memories for the query "ai"', () => {
    const result = retrieve('ai');
    expect(result.hits.length, 'retrieving "ai" returned nothing').toBeGreaterThan(0);
    expect(result.context.toLowerCase()).toContain('agents');
    expect(result.stopId).toBe('now');
  });

  it('returns at least one memory, confidently, for every prompt we suggest', () => {
    expect(suggestedPrompts.length).toBe(4);

    for (const prompt of suggestedPrompts) {
      const result = retrieve(prompt);
      expect(result.hits.length, `no memory retrieved for a prompt we ship: "${prompt}"`).toBeGreaterThan(0);
      expect(result.confident, `a prompt we ship is not confidently routed: "${prompt}"`).toBe(true);
      expect(result.stopId, `a prompt we ship routes nowhere: "${prompt}"`).not.toBeNull();
      expect(result.context, `malformed retrieval block for "${prompt}"`).toMatch(/^\[[a-z0-9]+\/[a-z0-9-]+\] /);
    }
  });

  it('honours k, and never returns more blocks than hits', () => {
    const result = retrieve('ai agents at krunch labs', { k: 2 });
    expect(result.hits.length).toBe(2);
    expect(result.context.split('\n\n').length).toBe(2);
  });

  it('says nothing rather than something when the corpus has nothing', () => {
    const result = retrieve('zzzzqqqq wumpus frobnicate');
    expect(result.hits).toEqual([]);
    expect(result.context).toBe('');
    expect(result.stopId).toBeNull();
    expect(result.confident).toBe(false);
  });

  it('formats context as [stopId/id] title, body -- the shape the route hands the model', async () => {
    const result = retrieve('taboola');
    expect(result.context).toMatch(/^\[work\/project-taboola\] Taboola product work\n/);
    // The deprecated shim exists only so app/api/ask/route.ts keeps compiling until the
    // route is rewired. If it ever stops agreeing with `context`, the route is being lied to.
    await expect(retrieveMemories('taboola')).resolves.toBe(result.context);
  });
});
