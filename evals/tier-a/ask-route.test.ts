/**
 * The answer path, end to end, with the model replaced by a mock.
 *
 * Nothing else in this repo exercises `/api/ask`. The red team's finding on the previous
 * route was that its tool definition threw inside the stream *after* the 200 had been
 * sent, so the try/catch never saw it and every visitor got a silent failure. These tests
 * read the actual UI message stream a client would receive and assert on the order and
 * content of its parts, so that class of defect cannot ship again unnoticed.
 *
 * The model is `MockLanguageModelV4` from `ai/test`; retrieval, the guard and the corpus
 * are the real ones. A fabricated answer here is a real fabrication from this repo's
 * history, and the assertion is that it never reaches the page as prose.
 */
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { defaultDeps, handleAsk, type AskDeps } from '../../lib/ask/handler';
import type { EnvelopeData } from '../../lib/ask/types';
import { retrieve } from '../../lib/retrieve';
import { memoriesForStop } from '../../lib/corpus/load';
import { cardQuestion } from '../../lib/card-question';
import { STOPS } from '../../content/stops';

/* -- helpers ------------------------------------------------------------------ */

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://test/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/** A mock model that streams `text` as three deltas, then finishes cleanly. */
function modelSaying(text: string) {
  const third = Math.ceil(text.length / 3);
  const deltas = [text.slice(0, third), text.slice(third, 2 * third), text.slice(2 * third)];
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start', id: 't1' },
          ...deltas.map((delta) => ({ type: 'text-delta' as const, id: 't1', delta })),
          { type: 'text-end', id: 't1' },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: undefined },
            logprobs: undefined,
            usage: {
              inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: 20, text: 20, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

type Chunk = { type: string; [k: string]: unknown };

/** Reads an SSE UI-message-stream response into its JSON chunks, in order. */
async function chunksOf(res: Response): Promise<Chunk[]> {
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type') ?? '').toContain('text/event-stream');
  const text = await res.text();
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice('data: '.length).trim())
    .filter((s) => s && s !== '[DONE]')
    .map((s) => JSON.parse(s) as Chunk);
}

function envelopes(chunks: Chunk[]): EnvelopeData[] {
  return chunks.filter((c) => c.type === 'data-envelope').map((c) => c.data as EnvelopeData);
}

function streamedText(chunks: Chunk[]): string {
  return chunks
    .filter((c) => c.type === 'text-delta')
    .map((c) => String(c.delta ?? ''))
    .join('');
}

const admitAll: AskDeps['admit'] = async () => ({ ok: true });

function depsWith(model: MockLanguageModelV4, overrides: Partial<AskDeps> = {}): AskDeps {
  return {
    ...defaultDeps,
    hasApiKey: () => true,
    admit: admitAll,
    askModel: () => ({ model, providerOptions: { openrouter: { models: [] } } }),
    ...overrides,
  };
}

const neverCalled: AskDeps['askModel'] = () => {
  throw new Error('the model must not be called on this path');
};

/* -- tests --------------------------------------------------------------------- */

describe('/api/ask rejects what it should before doing any work', () => {
  it('413 on a body over the byte cap', async () => {
    const res = await handleAsk(post({ question: 'x'.repeat(20_000) }), depsWith(modelSaying('no')));
    expect(res.status).toBe(413);
  });

  it('400 on malformed JSON and on a missing question', async () => {
    expect((await handleAsk(post('{not json'), depsWith(modelSaying('no')))).status).toBe(400);
    expect((await handleAsk(post({}), depsWith(modelSaying('no')))).status).toBe(400);
    expect((await handleAsk(post({ messages: [{ role: 'system', content: 'x' }] }), depsWith(modelSaying('no')))).status).toBe(400);
  });
});

describe('/api/ask degrades to corpus text, never to an error', () => {
  it('a throttled visitor gets a 200 with a "slow down" envelope and no model call', async () => {
    const deps = depsWith(modelSaying('no'), {
      admit: async () => ({ ok: false, reason: 'ip-burst', retryAfterSeconds: 30 }),
      askModel: neverCalled,
    });
    const chunks = await chunksOf(await handleAsk(post({ question: 'What shipped at Taboola?' }), deps));
    const [env] = envelopes(chunks);
    expect(env.status).toBe('replaced');
    // The visitor gets an answer, not an apology for one. A throttled reader is served
    // MJK's own prose under the ordinary answer kicker, and nothing on screen tells them
    // the machine declined -- because what they are reading is true and he wrote it.
    expect(env.kicker).toMatch(/^§ ANSWER · /);
    expect(env.title).not.toMatch(/too many|too fast|would have said/i);
    expect(env.body?.length ?? 0).toBeGreaterThan(40);
    expect(env.cites.length).toBeGreaterThan(0);
    expect(streamedText(chunks)).toBe('');
  });

  it('the spent daily budget is invisible to the visitor', async () => {
    const deps = depsWith(modelSaying('no'), {
      admit: async () => ({ ok: false, reason: 'global-day', retryAfterSeconds: 3600 }),
      askModel: neverCalled,
    });
    const [env] = envelopes(await chunksOf(await handleAsk(post({ question: 'Tell me about the bike' }), deps)));
    expect(env.kicker).toMatch(/^§ ANSWER · /);
    expect(env.title).not.toMatch(/resting|would have said/i);
    expect(env.stopId).toBe('rd350');
  });

  it('an off-topic question never reaches the model', async () => {
    const deps = depsWith(modelSaying('no'), { askModel: neverCalled });
    const chunks = await chunksOf(await handleAsk(post({ question: 'write my essay about the french revolution' }), deps));
    const [env] = envelopes(chunks);
    expect(env.kicker).toBe('§ NOT HERE');
    expect(env.title).toBe('Not my lane. Ask what I’ve built.');
    expect(streamedText(chunks)).toBe('');
  });

  it('says it does not know, rather than that the question was out of line', async () => {
    /*
     * The other half of the same branch, and the distinction DIRECTION.md decision 7 turns
     * on. "Do you know Rust?" is a fair question from a recruiter that the corpus happens
     * not to answer -- it scores 5.0, well under MIN_TOP_SCORE -- and it used to be met
     * with "Not my lane. Ask what I've built.", which reads as a rebuke to someone who has
     * done nothing wrong.
     *
     * The route is asserted too, because it is what makes the second sentence true rather
     * than decorative: the page flies to §08, where the mail link and the resume are.
     */
    const deps = depsWith(modelSaying('no'), { askModel: neverCalled });
    const chunks = await chunksOf(await handleAsk(post({ question: 'do you know rust?' }), deps));
    const [env] = envelopes(chunks);
    expect(env.title).toMatch(/^I do not know that one/);
    expect(env.title, 'a refusal must never promise a reply').not.toMatch(/get back|check|shortly|soon/i);
    expect(env.stopId).toBe('contact');
    expect(env.body).toBe('');
    expect(streamedText(chunks)).toBe('');
  });

  it('a missing API key still answers, with the stop already chosen', async () => {
    const deps = depsWith(modelSaying('no'), { hasApiKey: () => false, askModel: neverCalled });
    const [env] = envelopes(await chunksOf(await handleAsk(post({ question: 'What shipped at Taboola?' }), deps)));
    expect(env.kicker).toMatch(/^§ ANSWER · /);
    expect(env.title).not.toMatch(/quiet|would have said/i);
    // Taboola is an employer, so it lives on the career stop. "Selected work" holds the
    // things that were built, not the places they were built at.
    expect(env.stopId).toBe('apac');
  });
});

/**
 * The tail under an answer is the question the answer did NOT answer.
 *
 * It is the one part of the envelope that is a function of the model's output, and it must
 * stay a function of it in the only direction that is safe: the prose is scored, never
 * obeyed. So the assertions here are about the RANKING, not about a particular memory --
 * the same answer, said two different ways, has to move the pick.
 */
describe('the tail is the memory the answer used least', () => {
  const question = 'Tell me about JewelAI Studio, under the hood.';

  /**
   * The same candidate set `nextQuestionCandidates` builds: this stop's memories, the ones
   * retrieval ranked first and in its order, then the rest as MJK wrote them, minus the
   * memory the answer is about.
   */
  function candidatesFor(q: string): { id: string; title: string }[] {
    const r = retrieve(q);
    const licences = r.hits.map((h) => h.memory);
    const ranked = licences.filter((m) => m.stopId === r.stopId);
    const seen = new Set(ranked.map((m) => m.id));
    const rest = memoriesForStop(r.stopId!).filter((m) => !seen.has(m.id));
    return [...ranked, ...rest]
      .filter((m) => m.id !== licences[0]?.id && /[a-z0-9]{4,}/.test(m.title.toLowerCase()))
      .map((m) => ({ id: m.id, title: m.title }));
  }

  /*
   * A tail offers a memory whose question must come back to it, exactly as a card's does.
   * `evals/tier-a/cards.test.ts` holds that for the memories StopSection draws; the tail can
   * offer any memory on its stop, including ones nothing draws, so the same property has to
   * be asserted over that wider set or the tail can quietly send a reader somewhere else.
   *
   * The filter mirrors `coverageOf`'s own rule: a title with no content word of four letters
   * or more cannot be measured and is never picked. "Who I am" is the only one in this
   * corpus, and it is also the only stop memory whose question does not rank itself first --
   * the measurement and the routing agree about it from opposite directions, which is the
   * reason this filter is a statement about the corpus and not a convenience.
   */
  it('offers only memories whose own question comes back to them', () => {
    const wrong: string[] = [];
    for (const stop of STOPS) {
      if (stop.id === 'hero') continue;
      for (const m of memoriesForStop(stop.id)) {
        if (!/[a-z0-9]{4,}/.test(m.title.toLowerCase())) continue;
        const r = retrieve(cardQuestion(m.title), { viewing: m.stopId });
        if (r.stopId === m.stopId && r.hits[0]?.memory.id === m.id && r.topical) continue;
        wrong.push(`  ${JSON.stringify(m.title)} (${m.id}) -> stop=${r.stopId} top=${r.hits[0]?.memory.id}`);
      }
    }
    expect(wrong, `a next question would not come back to its own memory:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('has more than one memory to choose between, or this test proves nothing', () => {
    expect(candidatesFor(question).length).toBeGreaterThan(1);
  });

  /*
   * The envelope that goes out at ~15ms cannot measure anything -- the answer does not
   * exist yet -- so its card is chosen by rank alone. It is still on screen for the whole
   * time a visitor watches an answer arrive, so it is bound by the same rule as the final
   * one, and it was not: section one offered "Who I am" for those seconds, the single
   * question on this site that does not come back to the card that asked it.
   */
  it('never offers a memory whose question would not come back, not even while streaming', async () => {
    // "The arc, compressed" is the case this was measured on: `origin` holds "Who I am" as
    // its last memory, and the rank-only guess reached for exactly that.
    for (const q of ['Tell me about The arc, compressed.', question]) {
      const chunks = await chunksOf(await handleAsk(post({ question: q }), depsWith(modelSaying('It is a pipeline.'))));
      const offered = envelopes(chunks).flatMap((e) => e.cards.map((c) => c.id));
      const ids = new Set(candidatesFor(q).map((c) => c.id));
      expect(offered.filter((id) => !ids.has(id)), `\`${q}\` offered a memory outside its candidate set`).toEqual([]);
    }
  });

  it('offers at most one, and never the memory the answer is about', async () => {
    const licences = retrieve(question).hits.map((h) => h.memory);
    const chunks = await chunksOf(
      await handleAsk(post({ question }), depsWith(modelSaying('JewelAI Studio is a multi-agent pipeline for jewellery imagery.'))),
    );
    const last = envelopes(chunks).at(-1) as EnvelopeData;
    expect(last.cards.length).toBeLessThanOrEqual(1);
    expect(last.cards.map((c) => c.id)).not.toContain(licences[0]?.id);
  });

  it('moves the pick when the answer covers a different memory', async () => {
    const candidates = candidatesFor(question);

    /** An answer written to be entirely about one candidate, in units the scorer counts. */
    const allAbout = (title: string) =>
      [`${title} is the thing here.`, `${title} is what this section is for.`, `${title} again.`].join(' ');

    const pickAfter = async (text: string) => {
      const chunks = await chunksOf(await handleAsk(post({ question }), depsWith(modelSaying(text))));
      const last = envelopes(chunks).at(-1) as EnvelopeData;
      return last.cards[0]?.id;
    };

    // Saturate the first candidate: it can no longer be the least-used one, so the pick
    // must be some other candidate. Then saturate that one and watch the pick move again.
    const first = await pickAfter(allAbout(candidates[0].title));
    expect(first).not.toBe(candidates[0].id);
    expect(candidates.map((c) => c.id)).toContain(first);

    const saturated = candidates.find((c) => c.id === first);
    expect(saturated).toBeDefined();
    const second = await pickAfter(`${allAbout(candidates[0].title)} ${allAbout(saturated!.title)}`);
    expect(second).not.toBe(candidates[0].id);
    expect(second).not.toBe(saturated!.id);
  });

  it('breaks a tie by retrieval rank, so an answer that names nobody is still deterministic', async () => {
    const candidates = candidatesFor(question);
    // Prose that mentions none of them: every candidate scores exactly 0, and the rule that
    // decides is "strictly lower wins", which keeps the best-ranked one.
    const chunks = await chunksOf(
      await handleAsk(post({ question }), depsWith(modelSaying('It is a pipeline. It runs end to end.'))),
    );
    const last = envelopes(chunks).at(-1) as EnvelopeData;
    expect(last.cards[0]?.id).toBe(candidates[0].id);
  });
});

describe('/api/ask streams a grounded answer in the right order', () => {
  const question = 'How did you automate reporting at Kinnect?';
  const truth =
    'At Kinnect I automated reporting with Supermetrics and Looker Studio and cut report generation time by half. I also grew the media team from two to five.';

  it('route first, envelope second, prose after, verdict last', async () => {
    const chunks = await chunksOf(await handleAsk(post({ question }), depsWith(modelSaying(truth))));
    const types = chunks.map((c) => c.type);

    expect(types[0]).toBe('start');
    expect(types[1]).toBe('data-route');
    expect(types[2]).toBe('data-envelope');
    expect(types.indexOf('text-delta')).toBeGreaterThan(types.indexOf('data-envelope'));
    expect(types.at(-1)).toBe('finish');

    const [first, last] = envelopes(chunks);
    expect(first.status).toBe('streaming');
    expect(first.stopId).toBe(retrieve(question).stopId);
    expect(first.kicker).toMatch(/^§ ANSWER · /);
    // At most one card, and never before the stream: the tail is a next question, and a
    // list that shrank from three to one when the caret stopped would take a grid row out
    // of the section at the exact moment the reader started reading it.
    expect(first.cards.length).toBeLessThanOrEqual(1);
    expect(first.cards.every((card) => !('metric' in card))).toBe(true);
    expect(first.cites).toContain('project-kinnect-automation');

    expect(last.status).toBe('verified');
    expect(last.body).toBeUndefined();
    expect(streamedText(chunks)).toBe(truth);
  });

  it('routes with the same id the envelope carries, so the page and the layout agree', async () => {
    const chunks = await chunksOf(await handleAsk(post({ question }), depsWith(modelSaying(truth))));
    const route = chunks.find((c) => c.type === 'data-route')?.data as { stopId: string; index: number };
    const [env] = envelopes(chunks);
    expect(route.stopId).toBe(env.stopId);
    expect(route.index).toBe(env.index);
  });
});

describe('/api/ask strips the model talking to itself', () => {
  // A critical review of the live site found one question in eight answered with
  // "User Safety: safe" and nothing else. Free-tier models sometimes emit their own
  // moderation verdict, a role label or a code fence around the prose. The grounding
  // guard is no defence: a classifier label carries no number and no proper noun, so it
  // is perfectly grounded and passes untouched.
  it('drops a moderation label that arrives with the answer', async () => {
    const leaked = [
      'User Safety: safe',
      '',
      'I rebuilt a 1986 Yamaha RD 350 into a cafe racer of my own design. The build ran June to December 2014, back home in Kerala.',
    ].join('\n');
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'tell me about the bike' }), depsWith(modelSaying(leaked))),
    );
    const last = envelopes(chunks).at(-1)!;
    const shown = last.body ?? streamedText(chunks);
    expect(shown).not.toMatch(/user safety/i);
    expect(shown).toContain('RD 350');
  });

  // Caught live: "From my memory I do — my LinkedIn and consulting periods covered India,
  // Thailand and Singapore." The site is written in MJK's first person throughout, and a
  // sentence that opens by naming its own source is a retrieval system answering instead
  // of him.
  it('drops a source-narrating opener and keeps the sentence', async () => {
    const narrated =
      'From my memory, I founded Krunch Labs in January 2025 in Singapore, building AI systems for consumer and B2B clients.';
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'what is Krunch Labs?' }), depsWith(modelSaying(narrated))),
    );
    const shown = envelopes(chunks).at(-1)!.body ?? streamedText(chunks);
    expect(shown).not.toMatch(/from my memory/i);
    expect(shown).toMatch(/^I founded Krunch Labs/);
  });

  it('titles the answer from the memory the answer actually used', async () => {
    const chunks = await chunksOf(
      await handleAsk(
        post({ question: 'What shipped at Taboola?' }),
        depsWith(
          modelSaying(
            'I led product rollouts at Taboola: emerging-market payment expansion into Korea and Indonesia, the APAC Ads Interface revamp, and a global two-factor authentication launch.',
          ),
        ),
      ),
    );
    expect(envelopes(chunks).at(-1)!.title).toMatch(/taboola/i);
  });

  // A dek is a promise about the paragraph under it. The panel found "What that looked
  // like in numbers" sitting over an answer with no numbers in it, because the title was
  // chosen from the top retrieval hit before a word had been generated.
  it('drops the dek when no licensed memory is reflected in the answer', async () => {
    const chunks = await chunksOf(
      await handleAsk(
        post({ question: 'What shipped at Taboola?' }),
        depsWith(modelSaying('I would rather show you than list it out here.')),
      ),
    );
    const last = envelopes(chunks).at(-1)!;
    expect(last.title).toBe('');
  });

  // The other half of the same rule, and the more important one. "From" opens plenty of
  // true sentences in this corpus, and a filter that eats their first clause would be a
  // repeat of the punctuated-year bug that deleted MJK's bachelors from every answer.
  it('leaves a sentence that merely begins with a date alone', async () => {
    const dated =
      'From June to December 2014 I went home to Kerala and rebuilt a 1986 Yamaha RD 350 as a cafe racer of my own design.';
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'tell me about the bike' }), depsWith(modelSaying(dated))),
    );
    const shown = envelopes(chunks).at(-1)!.body ?? streamedText(chunks);
    expect(shown).toMatch(/^From June to December 2014/);
  });

  it('falls back rather than showing a label as the whole answer', async () => {
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'tell me about the bike' }), depsWith(modelSaying('User Safety: safe'))),
    );
    const last = envelopes(chunks).at(-1)!;
    expect(last.status).toBe('replaced');
    expect(last.body).toBeDefined();
    expect(last.body).not.toMatch(/user safety/i);
    // The visitor still reads something true rather than a blank space.
    expect((last.body ?? '').length).toBeGreaterThan(40);
  });

  it('leaves prose that merely contains a colon alone', async () => {
    const real =
      'I treat delivery as a gated system: nothing ships without a check. That is the job.';
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'how do you direct an agent' }), depsWith(modelSaying(real))),
    );
    expect(streamedText(chunks)).toContain('gated system:');
  });
});

describe('/api/ask never lets a fabrication reach the page as prose', () => {
  it('a wholly fabricated answer is replaced by the licensed memory', async () => {
    const fabricated = 'At Canon I drove a 5x lift in awareness across 12 markets.';
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'What did you do for Canon?' }), depsWith(modelSaying(fabricated))),
    );
    const last = envelopes(chunks).at(-1)!;
    expect(last.status).toBe('replaced');
    // It used to be badged "§ VERIFIED", stamping the word verified on the one path where
    // verification failed. It now reads as an ordinary answer, which is what it is.
    expect(last.kicker).toMatch(/^§ ANSWER · /);
    expect(last.body).toBeDefined();
    // The replacement is corpus text chosen from the retrieved memories, so the Canon
    // memory (which says plainly that no number is quoted for Canon) leads.
    expect(last.cites[0]).toBe('triad-canon');
    expect(last.body).not.toMatch(/Canon[^.]*5x/i);
    expect(last.body).not.toMatch(/12 markets/i);
  });

  it('a mostly true answer keeps its true sentences and drops the invented one', async () => {
    const mixed =
      'At Kinnect I automated reporting with Supermetrics and Looker Studio and cut report generation time by half. I grew the media team from two to five. The reporting work took a week of analyst work per client per month before that. I realised the marketing job was a systems job in disguise.';
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'How did you automate reporting at Kinnect?' }), depsWith(modelSaying(mixed))),
    );
    const last = envelopes(chunks).at(-1)!;
    expect(last.status).toBe('salvaged');
    expect(last.body).toContain('cut report generation time by half');
    expect(last.body).not.toMatch(/week of analyst work/i);
    expect(last.note).toMatch(/one line removed/);
  });

  it('a counted word the corpus never counted is removed, and the sentence survives', async () => {
    // This is the live shape: the corpus lists the rollouts without numbering them, and the
    // model counts them. The number goes; the true sentence stays.
    const counted =
      'I led three product rollouts at Taboola: emerging-market payment expansion into Korea and Indonesia, the APAC Ads Interface revamp, and a global two-factor authentication launch.';
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'What shipped at Taboola?' }), depsWith(modelSaying(counted))),
    );
    const last = envelopes(chunks).at(-1)!;
    expect(last.status).toBe('salvaged');
    expect(last.body).toMatch(/^I led product rollouts at Taboola/);
    expect(last.body).toContain('Korea and Indonesia');
    expect(last.note).toMatch(/one number removed/);
  });
});

/*
 * The site used to forget the previous question whenever the subject changed.
 *
 * The gate was `previousStopId === stopId`, and consecutive questions rarely land on the
 * same section, so a visitor who asked about JewelAI, then about rates, then came back was
 * a stranger every time. What caused the original defect -- an answer about section seven
 * arriving on section six -- was the full prior answer replayed as an `assistant` turn, and
 * the fix for that was compressing it to one labelled line. The gate on top was a second
 * belt, and it cost the site its memory.
 */
describe('the last two exchanges reach the model, whatever they were about', () => {
  /** A mock that records everything it was handed, and answers with one licensed word. */
  function capturing() {
    const seen: string[] = [];
    const model = new MockLanguageModelV4({
      doStream: async (options) => {
        seen.push(JSON.stringify(options));
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: 't1' },
              { type: 'text-delta', id: 't1', delta: 'Yes.' },
              { type: 'text-end', id: 't1' },
              {
                type: 'finish',
                finishReason: { unified: 'stop', raw: undefined },
                logprobs: undefined,
                usage: {
                  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
                  outputTokens: { total: 2, text: 2, reasoning: undefined },
                },
              },
            ],
          }),
        };
      },
    });
    return { model, seen };
  }

  it('carries two, across two different sections', async () => {
    const { model, seen } = capturing();
    await chunksOf(
      await handleAsk(
        post({
          question: 'what is your stack',
          history: [
            { q: 'tell me about jewelai studio', a: 'JewelAI Studio is a multi-service platform. It does more.' },
            { q: 'what do you charge', a: 'I scope the work first. Then I quote it.' },
          ],
        }),
        depsWith(model),
      ),
    );
    expect(seen[0]).toContain('tell me about jewelai studio');
    expect(seen[0]).toContain('what do you charge');
  });

  it('takes the first sentence of each and no more, so neither can outweigh the material', async () => {
    const { model, seen } = capturing();
    await chunksOf(
      await handleAsk(
        post({
          question: 'tell me about the bike',
          history: [
            { q: 'what shipped at taboola', a: 'Payments in Korea and Indonesia. The second sentence must not travel.' },
          ],
        }),
        depsWith(model),
      ),
    );
    expect(seen[0]).toContain('Payments in Korea and Indonesia.');
    expect(seen[0]).not.toContain('must not travel');
  });

  it('says nothing about a conversation that has not happened', async () => {
    const { model, seen } = capturing();
    await chunksOf(await handleAsk(post({ question: 'who are you' }), depsWith(model)));
    expect(seen[0]).not.toContain('Earlier in this conversation');
  });
});
