import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type LanguageModel,
  type ModelMessage,
} from 'ai';

type ProviderOptions = NonNullable<Parameters<typeof streamText>[0]['providerOptions']>;
import { stopById, type StopId } from '../../content/stops';
import type { AskUIMessage, EnvelopeData } from './types';
import { fallbackBlock, type FallbackBlock, type FallbackReason } from '../fallback';
import { guard, salvageDetailed } from '../grounding/guard';
import { askModel, hasApiKey } from '../provider';
import { retrieve, type RetrievalResult } from '../retrieve';
import { admit, clientIp, type AdmitResult } from '../security/limits';
import { MAX_BODY_BYTES, parseAskBody } from '../security/schema';

/**
 * How an answer happens.
 *
 *   t≈0    validate the body; admit the visitor (per-IP burst, per-IP day, global day)
 *   t≈5ms  retrieve() -> the stop this question belongs to, the memories that license it
 *   t≈10ms `data-route` goes out: the page scrolls to the stop before the model speaks
 *   t≈15ms `data-envelope` goes out: kicker, title, cards, cites -- the whole layout,
 *          chosen deterministically. The model has no say in any of it.
 *   ...    the model streams prose, and only prose
 *   end    guard() checks every number and every proper noun in that prose against the
 *          retrieved memories. Verified -> shown. Some sentences fail -> those sentences
 *          go. Too many fail -> the licensed memory text replaces the answer.
 *
 * Every refusal path (too fast, budget spent, off-topic, no provider) returns HTTP 200 and
 * an envelope built from corpus text, so the visitor always reads something true.
 *
 * This lives in lib/ rather than in the route file because Next only allows HTTP-method
 * exports from a route module, and the handler wants a `deps` seam for tests.
 */

/** Everything the handler reaches for that a test wants to replace. */
export type AskDeps = {
  hasApiKey: () => boolean;
  /** Loosely typed on purpose: tests hand in `MockLanguageModelV4` from `ai/test`. */
  askModel: () => { model: LanguageModel; providerOptions?: ProviderOptions };
  admit: (ip: string) => Promise<AdmitResult>;
  retrieve: (question: string) => RetrievalResult;
  guard: typeof guard;
  salvage: typeof salvageDetailed;
  fallbackBlock: (stopId: StopId | null, reason: FallbackReason, preferIds?: readonly string[]) => FallbackBlock;
  systemPrompt: () => string;
};

const SYSTEM_PROMPT_PATH = join(process.cwd(), 'content', 'system-prompt.md');

export const defaultDeps: AskDeps = {
  hasApiKey,
  askModel,
  admit,
  retrieve,
  guard,
  salvage: salvageDetailed,
  fallbackBlock,
  systemPrompt: () => readFileSync(SYSTEM_PROMPT_PATH, 'utf-8'),
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** `§ 07 — Selected work` -> `SELECTED WORK`. The hero has no dash; fall back to its id. */
function stopLabel(stopId: StopId): string {
  const kicker = stopById(stopId).kicker;
  const afterDash = kicker.split('—')[1]?.trim();
  return (afterDash ?? stopId).toUpperCase();
}

const DEFAULT_STOP: StopId = 'now';

function envelopeFromFallback(stopId: StopId | null, block: FallbackBlock): EnvelopeData {
  const resolved = stopId && stopId !== 'hero' ? stopId : DEFAULT_STOP;
  return {
    stopId: resolved,
    index: stopById(resolved).index,
    kicker: block.kicker,
    title: block.title,
    cards: [],
    cites: block.cites,
    status: 'replaced',
    body: block.body,
  };
}

/** A complete UI message stream that carries one envelope and no model output. */
function fallbackResponse(envelope: EnvelopeData): Response {
  const stream = createUIMessageStream<AskUIMessage>({
    execute({ writer }) {
      writer.write({ type: 'start' });
      writer.write({
        type: 'data-route',
        data: { stopId: envelope.stopId, index: envelope.index },
        transient: true,
      });
      writer.write({ type: 'data-envelope', id: 'envelope', data: envelope });
      writer.write({ type: 'finish' });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

const ADMIT_REASON_TO_FALLBACK: Record<Exclude<AdmitResult, { ok: true }>['reason'], FallbackReason> = {
  'ip-burst': 'rate',
  'ip-day': 'rate',
  'global-day': 'budget',
  unavailable: 'provider',
};

export async function handleAsk(req: Request, deps: AskDeps = defaultDeps): Promise<Response> {
  // Read the body as bytes before parsing it. `req.json()` on a 40 MB paste buffers the
  // whole thing first, so the size limit has to be enforced on the text, not the object.
  const raw = await req.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return json({ error: 'body-too-large' }, 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: 'bad-request', detail: 'body is not valid JSON' }, 400);
  }

  const parsed = parseAskBody(payload);
  if (!parsed.ok) {
    return json({ error: 'bad-request', detail: parsed.reason }, parsed.status);
  }
  const { question, history = [] } = parsed.value;

  // Admission before retrieval: a visitor who is over their limit should not cost a
  // BM25 pass either, and the answer they get is still corpus text.
  const admitted = await deps.admit(clientIp(req.headers));
  const retrieved = deps.retrieve(question);
  const hitIds = retrieved.hits.map((h) => h.memory.id);
  const fallback = (stopId: StopId | null, reason: FallbackReason) =>
    fallbackResponse(envelopeFromFallback(stopId, deps.fallbackBlock(stopId, reason, hitIds)));

  if (!admitted.ok) {
    return fallback(retrieved.stopId, ADMIT_REASON_TO_FALLBACK[admitted.reason]);
  }

  // Not confident means the corpus has nothing that answers this. No model call: a model
  // asked to answer from thin air is exactly how the old site fabricated.
  if (!retrieved.confident || !retrieved.stopId || retrieved.stopId === 'hero') {
    return fallback(retrieved.stopId, 'off-topic');
  }

  const stopId = retrieved.stopId;
  const stop = stopById(stopId);

  if (!deps.hasApiKey()) {
    return fallback(stopId, 'provider');
  }

  const licences = retrieved.hits.map((h) => h.memory);
  // Cards belong to the stop the answer landed on. A Taboola question should not show
  // "The arc" as a card because it happened to score; the off-stop hits still license.
  const onStop = licences.filter((m) => m.stopId === stopId);
  const cardSource = onStop.length > 0 ? onStop : licences;
  const envelope: EnvelopeData = {
    stopId,
    index: stop.index,
    kicker: `§ ANSWER · ${stopLabel(stopId)}`,
    title: licences[0]?.title ?? stopLabel(stopId),
    cards: cardSource.slice(0, 3).map((m) => ({
      id: m.id,
      title: m.title,
      kicker: String(m.period ?? m.tags[0] ?? '').toUpperCase(),
    })),
    cites: licences.map((m) => m.id),
    status: 'streaming',
  };

  // ai v7 refuses a `system` role inside `messages`, which is the right shape for this
  // route: instructions travel in their own field and cannot arrive disguised as a turn.
  const instructions = `${deps.systemPrompt()}\n\n---\nRelevant memories:\n${retrieved.context}`;

  const messages: ModelMessage[] = [
    ...history.flatMap((turn): ModelMessage[] => [
      { role: 'user', content: turn.q },
      { role: 'assistant', content: turn.a },
    ]),
    { role: 'user', content: question },
  ];

  const { model, providerOptions } = deps.askModel();

  const stream = createUIMessageStream<AskUIMessage>({
    async execute({ writer }) {
      writer.write({ type: 'start' });
      // The route signal is the first thing on the wire: the page can start moving to
      // the stop while the model is still connecting.
      writer.write({ type: 'data-route', data: { stopId, index: stop.index }, transient: true });
      writer.write({ type: 'data-envelope', id: 'envelope', data: envelope });

      let failed = false;
      const result = streamText({
        model,
        instructions,
        messages,
        providerOptions,
        onError({ error }) {
          failed = true;
          console.error('[api/ask] streamText failed:', error);
        },
      });

      // Reasoning models think out loud; that text is not the answer and never reaches
      // the page. Only the prose does, and the guard gets the last word on the prose.
      writer.merge(result.toUIMessageStream({ sendStart: false, sendFinish: false, sendReasoning: false }));

      const startedAt = Date.now();
      let text = '';
      try {
        text = await result.text;
        const meta = await result.response;
        console.info(`[api/ask] ${meta.modelId} answered ${stopId} in ${Date.now() - startedAt} ms`);
      } catch (error) {
        failed = true;
        console.error('[api/ask] result.text rejected:', error);
      }

      const replaceWith = (block: FallbackBlock) =>
        writer.write({
          type: 'data-envelope',
          id: 'envelope',
          data: {
            ...envelope,
            kicker: block.kicker,
            title: block.title,
            status: 'replaced',
            body: block.body,
            cites: block.cites,
          },
        });

      if (failed || !text.trim()) {
        replaceWith(deps.fallbackBlock(stopId, 'provider', hitIds));
        writer.write({ type: 'finish' });
        return;
      }

      const verdict = deps.guard(text, licences, { topLicences: 3 });
      if (verdict.ok) {
        writer.write({ type: 'data-envelope', id: 'envelope', data: { ...envelope, status: 'verified' } });
      } else {
        console.warn(
          '[api/ask] guard rejected:',
          verdict.violations.map((v) => `${v.kind}: ${v.detail}`).join(' | '),
        );
        const kept = deps.salvage(text, verdict);
        if (kept) {
          const parts: string[] = [];
          if (kept.dropped) parts.push(kept.dropped === 1 ? 'one line removed' : `${kept.dropped} lines removed`);
          if (kept.redacted) parts.push(kept.redacted === 1 ? 'one number removed' : `${kept.redacted} numbers removed`);
          writer.write({
            type: 'data-envelope',
            id: 'envelope',
            data: {
              ...envelope,
              status: 'salvaged',
              body: kept.text,
              note: `Checked against the corpus; ${parts.join(', ')}.`,
            },
          });
        } else {
          replaceWith(deps.fallbackBlock(stopId, 'unguarded', hitIds));
        }
      }
      writer.write({ type: 'finish' });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
