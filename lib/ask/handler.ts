import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
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
  retrieve: (question: string, opts?: { viewing?: StopId | null }) => RetrievalResult;
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

/**
 * Model housekeeping that is not an answer.
 *
 * A critical review of the live site found one question in eight returning `User Safety:
 * safe` as the entire visible answer. Free-tier models sometimes emit their own
 * moderation verdict, a role label or a fenced preamble before, or instead of, the prose.
 * The grounding guard cannot help: a classifier label contains no number and no proper
 * noun, so it is perfectly "grounded" and sails through.
 *
 * Stripped line by line rather than by trimming a prefix, because it turns up before the
 * answer, after it, and occasionally on its own.
 */
const MODEL_ARTEFACT =
  /^\s*(?:```+\w*|(?:user\s+|content\s+)?(?:safety|moderation|policy|classification|category|rating|verdict|assistant|answer|response)\s*[:：-]\s*\S.{0,60}|\[?(?:safe|unsafe|flagged|ok)\]?)\s*$/i;

/**
 * The model pointing at its own sources instead of using them.
 *
 * A review of the live site caught three of these in one session: "From my memory I do —
 * my LinkedIn and consulting periods covered India, Thailand and Singapore", "in the
 * available context", and "documented in the records". Each breaks the first person the
 * whole site is written in. A visitor asked Mathew a question and a retrieval system
 * answered them.
 *
 * The real fix is the system prompt, which no longer says the word "memories" at the
 * model and now forbids naming a source outright. This is the backstop for when it does
 * it anyway.
 *
 * Only a LEADING clause is removed, and only when what remains can stand as a sentence.
 * These phrases turn up mid-sentence too, where cutting one leaves ungrammatical prose —
 * and a filter that mangles a true sentence is the exact failure this repository has
 * already paid for once, when a year with a comma after it was read as a count and took
 * MJK's bachelors degree out of every answer about his education.
 *
 * The `(?:...[,:]|)` at the end is an ordered alternation and not a `?`, and the
 * difference matters. Written `[^.!?]{0,40}?[,:]?` the lazy quantifier prefers to match
 * nothing, so "Based on the records I have, I led product rollouts" keeps "I have," and
 * reads as if a sentence lost its head. The alternation tries the comma-terminated branch
 * first and falls back to empty, which is also what lets "From my memory I do — my
 * consulting periods…" lose only its first four words.
 */
const SOURCE_NARRATION =
  /^\s*(?:(?:based\s+on|from|according\s+to|going\s+by|as\s+(?:documented|recorded|noted)\s+in)\s+(?:my\s+|the\s+|what\s+i\s+have\s+)?(?:memor(?:y|ies)|records?|context|notes?|material|information)|in\s+the\s+available\s+context)\b(?:[^.!?]{0,40}?[,:]|)\s*/i;

function stripSourceNarration(text: string): string {
  const cut = text.replace(SOURCE_NARRATION, '');
  if (cut === text) return text;
  const rest = cut.trimStart();
  // If the clause was the whole sentence, or what follows opens mid-thought, keep the
  // original: a slightly self-conscious answer beats a broken one.
  return /^[A-Z"'“‘]/.test(rest) && rest.length > 24 ? rest : text;
}

function stripModelArtefacts(text: string): string {
  const lines = text
    .split('\n')
    .filter((line) => !MODEL_ARTEFACT.test(line))
    .join('\n')
    .trim();
  return stripSourceNarration(lines);
}

/** Enough of a prior answer to remember what was said, far too little to anchor on. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const end = /[.!?](\s|$)/.exec(trimmed);
  const cut = end ? trimmed.slice(0, end.index + 1) : trimmed;
  return cut.length > 240 ? `${cut.slice(0, 237).trimEnd()}...` : cut;
}

/**
 * An unannounced fallback wears the stop's ordinary answer kicker, so corpus prose
 * arrives looking like what it is: an answer. Only a refusal carries its own kicker.
 */
function envelopeFromFallback(stopId: StopId | null, block: FallbackBlock): EnvelopeData {
  const resolved = stopId && stopId !== 'hero' ? stopId : DEFAULT_STOP;
  return {
    stopId: resolved,
    index: stopById(resolved).index,
    kicker: block.kicker ?? `§ ANSWER · ${stopLabel(resolved)}`,
    title: block.title,
    cards: [],
    cites: block.cites,
    status: 'replaced',
    body: block.body,
  };
}

/**
 * Names, in a response header, what actually happened.
 *
 * The visitor is deliberately never told that a fallback fired -- corpus prose is a real
 * answer and apologising for it disparages MJK's own writing. But making it invisible to
 * the visitor made it invisible to HIM, and the first consequence was that the model
 * stopped being called at all and the site looked fine: every answer arrived in half a
 * second, correct and well written, and nothing said the model had been skipped.
 *
 * A header is the right place for that. It reaches curl, devtools and any monitor, and
 * reaches no reader.
 */
const DIAGNOSTIC = 'x-mjk-answer';

/** A complete UI message stream that carries one envelope and no model output. */
function fallbackResponse(envelope: EnvelopeData, diagnostic: string): Response {
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
  return createUIMessageStreamResponse({ stream, headers: { [DIAGNOSTIC]: diagnostic } });
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
  const { question, history = [], viewing, previousStopId } = parsed.value;

  // Admission before retrieval: a visitor who is over their limit should not cost a
  // BM25 pass either, and the answer they get is still corpus text.
  const admitted = await deps.admit(clientIp(req.headers));
  const retrieved = deps.retrieve(question, { viewing });
  const hitIds = retrieved.hits.map((h) => h.memory.id);
  const fallback = (stopId: StopId | null, reason: FallbackReason, detail: string = reason) =>
    fallbackResponse(
      envelopeFromFallback(stopId, deps.fallbackBlock(stopId, reason, hitIds)),
      `no-model:${detail}`,
    );

  if (!admitted.ok) {
    return fallback(retrieved.stopId, ADMIT_REASON_TO_FALLBACK[admitted.reason], admitted.reason);
  }

  // Refuse only when the question is not about MJK at all. It used to refuse whenever
  // retrieval was not CONFIDENT, which conflated two different things: "there is nothing
  // here to say" and "two stops tied". A real question that merely landed between stops
  // was told "not my lane", which is the rudest thing this site can do and was doing it
  // to people asking in good faith. Ambiguity is not grounds for a refusal -- the model
  // still gets real licences, and the guard still checks what it writes.
  if (!retrieved.topical || !retrieved.stopId || retrieved.stopId === 'hero') {
    return fallback(retrieved.stopId, 'off-topic');
  }

  const stopId = retrieved.stopId;
  const stop = stopById(stopId);

  if (!deps.hasApiKey()) {
    return fallback(stopId, 'provider', 'no-api-key');
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

  /*
   * The previous exchange, and the two rules that keep it from becoming the subject.
   *
   * This is the defect MJK found. He asked about a third-party report, which answered on
   * section seven. He then scrolled to section six and asked "can you give me more details
   * on these systems?" -- and was answered about the report. The router had picked section
   * six correctly; what beat it was the previous answer, replayed as a full `assistant`
   * turn in the recency-privileged slot, several thousand characters of it, against a
   * question whose own words carried almost no signal.
   *
   * Replaying the site's own answer as an `assistant` turn recreates from the inside the
   * exact hazard `lib/security/schema.ts` refuses from outside: text the model reads as
   * its own prior commitment rather than as material. The model already has no authority
   * over layout. It should have none over subject either.
   *
   * So: an exchange that happened somewhere else is dropped outright, because a new
   * section is a new subject. One that happened here survives as a single line inside the
   * instructions, trimmed to its first sentence, labelled as context rather than topic --
   * never as a turn, and never in `messages`, which now holds exactly one entry.
   */
  const sameSubject = previousStopId === stopId;
  const prior = sameSubject ? history.at(-1) : undefined;
  const priorLine = prior
    ? `\n\n---\nEarlier in this conversation, for continuity only. The subject of THIS question is the memories above, not this exchange.\nThey asked: ${prior.q}\nYou answered: ${firstSentence(prior.a)}`
    : '';

  const instructions = `${deps.systemPrompt()}\n\n---\nRelevant memories:\n${retrieved.context}${priorLine}`;

  const messages: ModelMessage[] = [{ role: 'user', content: question }];

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
        // Deltas arrive from the provider in whatever clumps its own token batching
        // produces, observed on the live site as e.g. " client success and ad" landing
        // as one piece -- so the answer lurched instead of streaming. This re-buffers
        // and re-emits on word boundaries at a fixed pace instead.
        experimental_transform: smoothStream({ chunking: 'word', delayInMs: 12 }),
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
      let stripped = false;
      try {
        const raw = await result.text;
        text = stripModelArtefacts(raw);
        stripped = text !== raw;
        if (stripped) console.warn('[api/ask] stripped model housekeeping from the answer');
        const meta = await result.response;
        console.info(`[api/ask] ${meta.modelId} answered ${stopId} in ${Date.now() - startedAt} ms`);
      } catch (error) {
        failed = true;
        console.error('[api/ask] result.text rejected:', error);
      }

      // The envelope's own kicker is already `§ ANSWER · <STOP>`, so an unannounced block
      // keeps it and the swap is invisible to the visitor, which is the intent.
      const replaceWith = (block: FallbackBlock) =>
        writer.write({
          type: 'data-envelope',
          id: 'envelope',
          data: {
            ...envelope,
            kicker: block.kicker ?? envelope.kicker,
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
        // A clean answer normally carries no body: the visitor keeps the prose that
        // streamed in. But the artefact strip happens after the stream, so if the model
        // prefixed its own moderation verdict the visitor has already watched it arrive.
        // Sending the cleaned text as a body replaces what is on screen; without this the
        // strip would sanitise the logs and leave the label sitting on the page.
        writer.write({
          type: 'data-envelope',
          id: 'envelope',
          data: { ...envelope, status: 'verified', ...(stripped ? { body: text } : {}) },
        });
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

  // The verdict is not known until the stream ends, so the header can only say that the
  // model was reached. What it said, and whether the guard kept it, is on the last
  // envelope. `model-called` versus any `no-model:` value is the distinction that matters.
  return createUIMessageStreamResponse({ stream, headers: { [DIAGNOSTIC]: 'model-called' } });
}
