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
    expect(env.kicker).toBe('§ SLOW DOWN');
    expect(env.body?.length ?? 0).toBeGreaterThan(40);
    expect(env.cites.length).toBeGreaterThan(0);
    expect(streamedText(chunks)).toBe('');
  });

  it('the spent daily budget reads as resting, not as an outage', async () => {
    const deps = depsWith(modelSaying('no'), {
      admit: async () => ({ ok: false, reason: 'global-day', retryAfterSeconds: 3600 }),
      askModel: neverCalled,
    });
    const [env] = envelopes(await chunksOf(await handleAsk(post({ question: 'Tell me about the bike' }), deps)));
    expect(env.kicker).toBe('§ RESTING');
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

  it('a missing API key reads as quiet, with the stop already chosen', async () => {
    const deps = depsWith(modelSaying('no'), { hasApiKey: () => false, askModel: neverCalled });
    const [env] = envelopes(await chunksOf(await handleAsk(post({ question: 'What shipped at Taboola?' }), deps)));
    expect(env.kicker).toBe('§ QUIET');
    expect(env.stopId).toBe('work');
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
    expect(first.cards.length).toBeGreaterThan(0);
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

describe('/api/ask never lets a fabrication reach the page as prose', () => {
  it('a wholly fabricated answer is replaced by the licensed memory', async () => {
    const fabricated = 'At Canon I drove a 5x lift in awareness across 12 markets.';
    const chunks = await chunksOf(
      await handleAsk(post({ question: 'What did you do for Canon?' }), depsWith(modelSaying(fabricated))),
    );
    const last = envelopes(chunks).at(-1)!;
    expect(last.status).toBe('replaced');
    expect(last.kicker).toBe('§ VERIFIED');
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
