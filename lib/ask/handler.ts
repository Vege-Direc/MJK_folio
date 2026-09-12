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
import type { AskUIMessage, EnvelopeCard, EnvelopeData } from './types';
import type { Memory } from '../corpus/schema';
import { memoriesForStop } from '../corpus/load';
import { fallbackBlock, type FallbackBlock, type FallbackReason } from '../fallback';
import { guard, salvageDetailed } from '../grounding/guard';
import {
  recordAsk,
  recordOutcome,
  recordStop,
  type AskOrigin,
  type AskOutcome,
} from '../instrument/counters';
// The same splitter the guard licenses by, so the dek is measured in the same units the
// answer is checked in -- and so a salvaged answer's dek is counted over what survived.
import { sentences } from '../grounding/text';
import { askModel, hasApiKey } from '../provider';
import { isWorkRequest, retrieve, type RetrievalResult } from '../retrieve';
import { admit, clientIp, hashIp, type AdmitResult } from '../security/limits';
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
  /**
   * The instrument (`DIRECTION.md` decision 11). Three counters, none of which the
   * visitor's answer depends on, all fire-and-forget. Behind `deps` for the same reason
   * everything else here is: an instrument nobody has ever read is exactly the thing that
   * needs a test asserting it observes what it claims to.
   */
  instrument: {
    ask: (opts: { ipHash: string | null; origin: AskOrigin; depth: number }) => void;
    stop: (stopId: StopId) => void;
    outcome: (outcome: AskOutcome) => void;
  };
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
  instrument: { ask: recordAsk, stop: recordStop, outcome: recordOutcome },
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** `§ 04 — Selected work` -> `SELECTED WORK`. The hero has no dash; fall back to its id. */
function stopLabel(stopId: StopId): string {
  const kicker = stopById(stopId).kicker;
  const afterDash = kicker.split('—')[1]?.trim();
  return (afterDash ?? stopId).toUpperCase();
}

const DEFAULT_STOP: StopId = 'now';

/**
 * Where a question he has no answer to goes. The refusal ends "It is better put to me
 * directly", and §08 is where directly is: the mail link, the resume and LinkedIn.
 */
const UNKNOWN_STOP: StopId = 'contact';

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

/**
 * The ceiling of last resort, and the reason it is not the control.
 *
 * MJK sent a screenshot of an answer running far past the viewport, and asked for a limit
 * in these words: "I agree we can allow text to be quite large but there has to be some
 * limit." So this is a ceiling, not a squeeze.
 *
 * MEASURED FIRST, 2026-09-06, on 20 real answers through the real corpus and the real
 * system prompt with `z-ai/glm-5.2:free`: 280 to 5,326 characters, median 924, and 19 of
 * the 20 came in at or under 2,370. The outlier -- "tell me everything about JewelAI
 * Studio in detail", 5,326 characters, 946 words, 1,069 output tokens -- was not a long
 * answer so much as a recital: six memory bodies reproduced near-verbatim, one after
 * another. The same sample gives 4.6 characters to the token, which is how the number
 * below converts. `finishReason` was `stop` on all 20, so nothing was truncating anything
 * and the length was the prompt's to give away, which it did in as many words.
 *
 * What that costs on the page, from this repo's own measurement rather than mine:
 * `app/globals.css` records that at 1440x900 a 1,424-character answer overshot the panel
 * by 87px and that the budget was about 1,100 characters. One desktop screen of answer is
 * therefore roughly 1,100 characters, and the runaway was about 4.8 of them.
 *
 * THE PROMPT WAS SUPPOSED TO BE THE CONTROL, AND IT IS NOT. That was the design -- a
 * model told a limit COMPOSES to it and lands on an ending, while a cap can only stop
 * mid-thought -- so `content/system-prompt.md` now names five paragraphs and about 350
 * words. Then it was A/B tested rather than assumed, on the question that produced the
 * runaway, uncapped, three runs each: WITHOUT the ceiling 4,729 / 5,597 / 3,197
 * characters, WITH it 5,211 / 4,373 / 4,174. Mean 4,508 against 4,586. Three runs a side
 * has no statistical power, but there is no effect here to have power over, and the honest
 * reading is that this model does not obey a stated length on a "tell me everything"
 * question. The ceiling stays in the prompt because the sentence it replaced --
 * "there is no length you are aiming at" -- was an explicit licence for exactly this, and
 * because a better model may listen. It is not what is holding the line.
 *
 * SO THIS IS THE CONTROL, and 600 tokens is chosen from the measured distribution: about
 * 2,760 characters, two and a half screens, above the p90 of the uncapped sample (2,370
 * characters, 478 tokens) so that an ordinary answer never meets it, and far below where
 * the recital went. Re-measured across 19 questions with the cap in place, it fired on 2:
 * both of the "tell me everything" shape, landing at 2,943 and 2,558 characters once the
 * trim below had run.
 *
 * WHAT HAPPENS AT THE BOUNDARY is the whole reason a cap alone would not do. A cut at 600
 * tokens lands wherever it lands -- measured, both of those two stopped mid-word.
 * `toLastSentence` backs the text up to the last full stop and the final envelope carries
 * the trimmed body, so the visitor never reads a half sentence. It cost 7.0% and 5.8% of
 * those two answers. If there is no full stop to back up to, or backing up would cost more
 * than half the answer, the text is left exactly as written: an over-long answer is a
 * nuisance and a mangled one is a defect, but so is throwing away three quarters of a
 * true answer to buy a tidy ending.
 */
const MAX_OUTPUT_TOKENS = 600;

/**
 * How long the provider gets before the page gives up on it.
 *
 * There was no limit at all: no `abortSignal`, no `maxDuration`, nothing. A provider that
 * accepted the connection and then stopped sending left the dock saying "Answering" and a
 * caret blinking, for as long as the visitor was willing to watch. On free OpenRouter
 * models that is not a remote possibility.
 *
 * 30 seconds because the measured end-to-end generation runs in single-digit seconds and
 * the two "tell me everything" answers that met the token cap took the longest; this is
 * well clear of a slow answer and well inside anyone's patience for a dead one. When it
 * fires, `onError` sets `failed` and the existing `provider` fallback prints corpus prose,
 * which is the same path a refused key already takes.
 */
const PROVIDER_TIMEOUT_MS = 30_000;

/**
 * Back up to the last sentence that actually finished.
 *
 * Deliberately not `sentences()` from the grounding splitter, which is the right unit for
 * licensing and the wrong one here: it normalises whitespace, and the blank line between
 * paragraphs is the only shape the answer surface has (`.answer-prose` is `pre-wrap`).
 * This only ever slices, so every paragraph break in front of the cut survives untouched.
 */
function toLastSentence(text: string): string {
  const boundary = /[.!?]["'”’)\]]?(?=\s|$)/g;
  let end = -1;
  for (let m = boundary.exec(text); m; m = boundary.exec(text)) end = m.index + m[0].length;
  if (end < 0) return text;
  const cut = text.slice(0, end).trimEnd();
  return cut.length * 2 < text.length ? text : cut;
}

/**
 * The dek over the answer, chosen once the answer exists.
 *
 * The envelope has to name a title before a word has been generated, and the only thing
 * available at that point is the highest-scoring memory. That is a guess about what the
 * answer will be about, and it is frequently wrong: asked "have you shipped anything I
 * can look at?", the site answered about MruNN-ERP and JewelAI Studio under the heading
 * "What that looked like in numbers" — a dek promising figures over a paragraph with no
 * figures in it. A review found the same mismatch on two of eight questions.
 *
 * So the final envelope re-titles from the memory the answer actually used. It changes
 * once, at the moment the caret stops, which is the only point where it can be right
 * rather than likely.
 *
 * WHICH DIRECTION THE MATCH RUNS IS THE WHOLE THING, and the first version had it
 * backwards. It scored a memory by the fraction of ITS TITLE's words that appeared
 * anywhere in the prose, so a one-word title scored a perfect 1.0 the moment it was
 * mentioned at all. MJK asked "Show me the AI work", got a seven-project survey, and read
 * it under the heading "TallyBridge" -- one of the seven, named once. Measured again on
 * this corpus, that rule put a dek on 19 of 30 real answers and 9 of the 19 named a
 * subject the answer was not about: "The Triad Co" over a whole career, "How I actually
 * direct an agent" over the Paxel report, "The ring I use to show what JewelAI Studio
 * does" over JewelAI's infrastructure.
 *
 * A dek is a heading, and WCAG 2.4.6 asks a heading to describe the topic of what follows
 * it. Lemarie, Lorch & Pery-Woodley (2012) measured what a partial one costs: readers
 * given a title that reflects only part of a document "fail to identify topics that are
 * not represented in the title", building their picture of the text around the title
 * instead. A dek naming one of seven projects does not merely look wrong -- it hides the
 * other six. Google's AI Overviews and Kagi's Quick Answer both put a fixed generic label
 * over a synthesised answer for the same reason.
 *
 * So the measurement runs the other way: how much of THE ANSWER does this memory account
 * for. A sentence mentions a memory when every one of its title's content words is in that
 * sentence, on word boundaries -- `includes` matched "agent" inside "directing an agents"
 * and that is how the Paxel dek happened. A sentence naming nothing carries on from the
 * one before it, once, no chaining: the guard's own pronoun rule, and unchained because
 * chaining hands the whole tail of an answer to whatever was named last, which is exactly
 * how "Taboola" came to head a nine-sentence career answer.
 *
 * The bar is a majority. "Describes what follows" means most of what follows.
 *
 * The cost is deks that were harmless: 8 of the same 30 answers keep one, and "Paid
 * media", "Why aircraft" and "What JewelAI Studio runs on" are dropped along with the
 * nine that were wrong. That is the intended trade. A missing dek costs a visitor nothing
 * -- `AnswerBlock` treats an empty title as a decision and renders nothing -- while a
 * wrong one contradicts the paragraph under it, and on a site whose entire claim is that
 * it does not make things up, that is the more expensive mistake.
 */
const DEK_BAR = 0.5;

/**
 * The answer, cut into the units coverage is counted in.
 *
 * A sentence OR a semicolon clause, because a series is written with semicolons --
 * "MruNN-ERP is a chat-native ERP; TallyBridge, an open-source bridge" -- and a series
 * counted as one unit hands the whole answer to whichever item comes first. MEASURED:
 * asked what he had built with AI agents, the site answered in a single 621-character
 * sentence listing a photoshoot pipeline, MruNN-ERP, JewelAI Studio and this site, and
 * JewelAI scored a perfect 1.0. That is the same "one of several, named once" heading this
 * measurement was rewritten to stop, arriving inside one sentence instead of across seven.
 */
function coverageUnits(answer: string): string[] {
  return sentences(answer)
    .flatMap((s) => s.split(';'))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * How much of the finished answer this memory accounts for, or `null` when that cannot be
 * measured at all.
 *
 * A unit mentions a memory when every one of its title's content words is in that unit, on
 * word boundaries -- `includes` matched "agent" inside "directing an agents" and that is
 * how a whole third-party report came to be headed "How I actually direct an agent". A
 * unit naming nothing carries on from the one before it, once, no chaining: the guard's own
 * pronoun rule, and unchained because chaining hands the tail of an answer to whatever was
 * named last.
 *
 * `null` is not zero, and the difference is load-bearing in both directions. "The RD 350"
 * and "The MJK-101" reduce to no content words, so nothing about them can be found in the
 * prose either way -- as a dek that means the title can never be shown to describe
 * anything, and as a next question it would otherwise win every argmin below by default and
 * put the same unmeasurable card under every answer on its stop.
 */
function contentWords(title: string): string[] {
  return title.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
}

function coverageOf(units: readonly string[], title: string): number | null {
  const words = contentWords(title);
  if (words.length === 0 || units.length === 0) return null;
  const named = words.map((w) => new RegExp(`\\b${w}\\b`));

  let covered = 0;
  let previousNamedIt = false;
  for (const unit of units) {
    const namesIt = named.every((re) => re.test(unit));
    if (namesIt || previousNamedIt) covered++;
    previousNamedIt = namesIt;
  }
  return covered / units.length;
}

function dekFor(answer: string, licences: readonly { title: string }[]): string {
  const units = coverageUnits(answer);
  if (units.length === 0) return '';

  let best = '';
  let bestCoverage = DEK_BAR; // the bar, not a starting score: at or below it, no dek

  for (const m of licences) {
    const coverage = coverageOf(units, m.title);
    if (coverage !== null && coverage > bestCoverage) {
      bestCoverage = coverage;
      best = m.title;
    }
  }
  return best;
}

function cardOf(m: Memory): EnvelopeCard {
  return { id: m.id, title: m.title, kicker: String(m.period ?? m.tags[0] ?? '').toUpperCase() };
}

/**
 * The memories a next question may be drawn from, best-ranked first.
 *
 * On-stop only -- a Taboola question must not offer "The arc" because it happened to score
 * -- and never the memory the answer is primarily about. `licences[0]` is what retrieval
 * ranked first, which `evals/tier-a/cards.test.ts` pins to the pressed card's own memory,
 * so offering it back is the echo this whole change exists to remove.
 *
 * THE STOP'S MEMORIES, NOT ONLY THE RETRIEVED ONES, and that widening was forced by a
 * measurement rather than chosen. Written the narrow way -- the retrieved memories on this
 * stop -- the tail never appeared at all. `AnswerBlock` draws it on `plain` stops only,
 * because everywhere else the memories are already cards beside the text, and there are
 * exactly two `plain` stops. Asked in a real browser: "Tell me about The arc, compressed."
 * retrieves `arc-aircraft-to-agents` and then two memories belonging to OTHER stops;
 * "Tell me about The pattern." retrieves `pattern-imagine-then-learn` and then five from
 * five other stops. One on-stop hit each, minus the memory the answer is about, is zero
 * candidates -- a feature that is a no-op everywhere it is allowed to run.
 *
 * Retrieval's job is to license an answer, so it ranks the whole corpus against a question
 * and returns the best few from anywhere. The tail's job is different: it asks what else is
 * written down HERE, and `stopId` is the corpus's own authored answer to that. So retrieval
 * still decides the order it can speak to -- its on-stop hits come first, in rank order --
 * and the rest of the section follows in the order MJK wrote them, which is deterministic
 * and is a real editorial judgement rather than a leftover of array position.
 *
 * Nothing unanswerable can arrive this way, and the last filter is what makes that
 * structural rather than incidental. Every memory here has this stop's `stopId`. A title
 * with no content word of four letters or more is dropped outright -- "Who I am" is the
 * only one in this corpus -- because coverage cannot be measured for it, and because it is
 * ALSO the only stop memory whose own question does not rank itself first. The measurement
 * and the routing agree about it from opposite directions.
 *
 * CAUGHT IN A BROWSER, and only in a browser. The filter used to live inside
 * `nextQuestionFor`, where an unmeasurable memory was skipped by the argmin -- which is
 * true of the FINAL envelope and was false of the one that goes out at ~15ms, whose card is
 * chosen by rank alone because the answer does not exist yet. So during the seconds a
 * visitor is actually watching an answer arrive, section one offered "Who I am": the single
 * question on this site that does not come back to the card that asked it. Excluding it
 * here means neither envelope can name it, and there is one rule rather than two.
 */
function nextQuestionCandidates(licences: readonly Memory[], stopId: StopId): Memory[] {
  const answeredAbout = licences[0]?.id;
  const ranked = licences.filter((m) => m.stopId === stopId);
  const seen = new Set(ranked.map((m) => m.id));
  const rest = memoriesForStop(stopId).filter((m) => !seen.has(m.id));
  return [...ranked, ...rest].filter(
    (m) => m.id !== answeredAbout && contentWords(m.title).length > 0,
  );
}

/**
 * THE NEXT QUESTION: the memory this stop retrieved that the finished answer used LEAST.
 *
 * WHAT WAS HERE BEFORE, AND WHY IT WAS THE WRONG THING. The cards under an answer were the
 * top three retrieved memories -- which is to say, the memories the answer had just been
 * written from. On the two `plain` stops, where `AnswerBlock` actually draws them, that made
 * the tail an echo: read a paragraph, then read the names of the things the paragraph was
 * about. It is the same defect the dek above has now been fixed for twice, arriving one
 * element further down the page. And nothing followed from it, because there was nothing to
 * press -- a visitor who had just been answered was offered nothing at all, on a site whose
 * entire thesis is that they will ask a second question.
 *
 * SO THE SELECTOR IS TURNED AROUND. `dekFor` scores every licensed memory by coverage -- the
 * fraction of the finished answer's units it accounts for -- at exactly the moment the
 * envelope is rewritten. It is already a used-versus-merely-retrieved detector. The dek
 * wants the argmax of it; the next question wants the argmin. One measurement read from
 * both ends, and no second notion of relevance to keep honest.
 *
 * THE MODEL HAS NO LAYOUT AUTHORITY HERE EITHER, and that distinction is what this whole
 * architecture rests on. Its prose is an INPUT to a server-side ranking over memories
 * retrieval had already chosen. It cannot name a card, add one, or reorder them. It can
 * only be measured.
 *
 * ONE, NOT THREE. Three next questions is a menu, and a menu is a thing to decide about
 * rather than a thing to do. It also took three grid cells on a page whose pixel budget is
 * already negative on two stops. One is self-limiting by construction: it is the question
 * this answer did not answer, and there is exactly one of those.
 *
 * TIES GO TO RETRIEVAL RANK. `candidates` arrives in retrieval order and the comparison is
 * strictly less-than, so an unbroken tie keeps the better-ranked memory. That matters more
 * than it looks: an answer that mentions none of its neighbours leaves every one of them at
 * coverage 0, and with no rule the pick would be whichever the array happened to end with.
 *
 * ITS FALSIFIER IS ALREADY BUILT. `depth` in `lib/instrument/counters.ts` is the ordinal of
 * a question inside its conversation -- "one ask is curiosity; two is the thesis". If this
 * tail works, the buckets above 1 rise. If they do not move, it does not work, and no
 * argument written here changes that.
 */
function nextQuestionFor(answer: string, candidates: readonly Memory[]): EnvelopeCard[] {
  const units = coverageUnits(answer);

  let pick: Memory | null = null;
  let lowest = Infinity;
  for (const m of candidates) {
    const coverage = coverageOf(units, m.title);
    if (coverage === null) continue;
    if (coverage < lowest) {
      lowest = coverage;
      pick = m;
    }
  }
  return pick ? [cardOf(pick)] : [];
}

/**
 * Enough of a prior answer to remember what was said, plus the question it ended on.
 *
 * A clarifying question is the LAST sentence of an answer by construction, and
 * `firstSentence` takes the first, so the one sentence the visitor is actually replying to
 * was the one sentence guaranteed not to travel. The site could ask "what is it for?",
 * read "a restaurant ordering bot", and have no idea what that was an answer to.
 */
function priorGist(text: string): string {
  const trimmed = text.trim();
  const first = firstSentence(trimmed);
  const asked = /(?:^|[.!?]\s)([^.!?]{3,160}\?)\s*$/.exec(trimmed)?.[1]?.trim();
  return asked && !first.includes(asked) ? `${first} … ${asked}` : first;
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
    // `announced` is true for exactly one reason, the refusal, and the page needs to know:
    // a block with no body must not collapse the paragraph it is sitting on top of.
    ...(block.announced ? { refused: true as const } : {}),
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

/**
 * The model's error part, dropped before it reaches the page.
 *
 * MEASURED, with a deliberately invalid provider key. The stream that went out was
 * `start`, `data-route`, `data-envelope` (six licensed cites, status `streaming`),
 * **`error`**, `data-envelope` (the fallback's two cites, status `replaced`), `finish` --
 * and the browser applied everything up to the error and nothing after it. So the visitor
 * was left holding the FIRST envelope: a dek reading "Education" with no body under it at
 * all, on a page whose whole recovery story is that corpus prose is a real answer.
 *
 * `toUIMessageStream` emits that part because a provider failure is, to it, the end of the
 * story. Here it is not: `onError` above has already set `failed`, and the `replaceWith`
 * path below writes MJK's own prose into a second envelope. The error part's only effect
 * is to stop that recovery arriving, which makes it strictly worse than nothing.
 *
 * Nothing is being hidden. `x-mjk-answer` still names what happened, and it reaches curl,
 * devtools and any monitor -- which is where a provider outage belongs, rather than in a
 * blank section a visitor has to interpret.
 */
function withoutErrorParts<T extends { type: string }>(source: ReadableStream<T>): ReadableStream<T> {
  return source.pipeThrough(
    new TransformStream<T, T>({
      transform(chunk, controller) {
        if (chunk.type !== 'error') controller.enqueue(chunk);
      },
    }),
  );
}

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
  const { question, history = [], viewing, origin } = parsed.value;

  const ip = clientIp(req.headers);
  /*
   * The question, counted before admission and before retrieval.
   *
   * BEFORE ADMISSION IS THE DECISION HERE. A visitor the limiter turns away still asked,
   * and an instrument that counted only the ones that got through would report an ask
   * rate that falls exactly when interest rises -- the single most misleading shape this
   * number could have. The throttle is recorded separately, as an outcome.
   *
   * `depth` is this question's ordinal inside its conversation, which the body already
   * carries as the length of `history` and which therefore costs no client state at all.
   * One ask is curiosity; two is the thesis this whole site is built on, and nothing else
   * here can tell them apart.
   */
  const ipHash = ip === 'unknown' ? null : hashIp(ip);
  deps.instrument.ask({ ipHash, origin: origin ?? 'unknown', depth: history.length + 1 });

  // Admission before retrieval: a visitor who is over their limit should not cost a
  // BM25 pass either, and the answer they get is still corpus text.
  const admitted = await deps.admit(ip);
  const retrieved = deps.retrieve(question, { viewing });
  const hitIds = retrieved.hits.map((h) => h.memory.id);
  const fallback = (stopId: StopId | null, reason: FallbackReason, detail: string = reason) =>
    fallbackResponse(
      envelopeFromFallback(stopId, deps.fallbackBlock(stopId, reason, hitIds)),
      `no-model:${detail}`,
    );

  if (!admitted.ok) {
    // `unavailable` is the limiter itself failing, not the visitor hitting a ceiling.
    deps.instrument.outcome(admitted.reason === 'unavailable' ? 'no-model' : 'throttled');
    return fallback(retrieved.stopId, ADMIT_REASON_TO_FALLBACK[admitted.reason], admitted.reason);
  }

  /*
   * Refuse only when the question is not about MJK at all. It used to refuse whenever
   * retrieval was not CONFIDENT, which conflated two different things: "there is nothing
   * here to say" and "two stops tied". A real question that merely landed between stops
   * was told "not my lane", which is the rudest thing this site can do and was doing it
   * to people asking in good faith. Ambiguity is not grounds for a refusal -- the model
   * still gets real licences, and the guard still checks what it writes.
   *
   * WHICH REFUSAL, and the distinction is the whole of `DIRECTION.md` decision 7. This one
   * branch was answering two unrelated questions with the same four words: "review my code"
   * is a request to do the visitor's work and gets declined, while "do you know Rust?" is a
   * fair question that MJK has simply not written an answer to. `isWorkRequest` is the only
   * one of the two that is legible in the question itself, so it decides, and everything
   * else that could not be answered is treated as something he does not know -- which is
   * the honest reading of a corpus that came up empty.
   *
   * The unknown refusal is routed to `contact` rather than to whatever stop the router was
   * guessing at, because its second sentence says the question is better put to him
   * directly and the page flies to the stop in this envelope. Sending it anywhere else
   * would make that sentence a gesture at nothing.
   */
  if (!retrieved.topical || !retrieved.stopId || retrieved.stopId === 'hero') {
    if (isWorkRequest(question)) {
      deps.instrument.outcome('off-topic');
      return fallback(retrieved.stopId, 'off-topic');
    }
    deps.instrument.outcome('unanswered');
    return fallback(UNKNOWN_STOP, 'unknown');
  }

  const stopId = retrieved.stopId;
  const stop = stopById(stopId);

  // The section the page is about to fly to. `DIRECTION.md` decision 1 is falsified by
  // exactly this distribution: visitors reaching `work` by asking rather than scrolling.
  deps.instrument.stop(stopId);

  if (!deps.hasApiKey()) {
    deps.instrument.outcome('no-model');
    return fallback(stopId, 'provider', 'no-api-key');
  }

  const licences = retrieved.hits.map((h) => h.memory);
  const candidates = nextQuestionCandidates(licences, stopId);
  const envelope: EnvelopeData = {
    stopId,
    index: stop.index,
    kicker: `§ ANSWER · ${stopLabel(stopId)}`,
    title: licences[0]?.title ?? stopLabel(stopId),
    /*
     * The next question, guessed, because the answer it is measured against does not exist
     * yet -- this envelope goes out at ~15ms, before the model has said anything.
     *
     * Retrieval rank is the only signal available at this point, and it points the same way:
     * the worst-ranked candidate is the one this answer is least likely to be about. So the
     * guess is `nextQuestionFor`'s own tie-break rule applied with every coverage unknown,
     * which is exactly what it reduces to. It is replaced by the measured pick when the
     * caret stops.
     *
     * ONE HERE AND ONE THERE, and that is deliberate rather than tidy. Three cards that
     * became one at the end of the stream would take a grid row away from a section as its
     * answer finished, and `.panel` is `overflow: hidden` -- on a page whose slack is already
     * negative on two stops, a late height change deletes something silently.
     */
    cards: candidates.length > 0 ? [cardOf(candidates[candidates.length - 1])] : [],
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
   * So: an exchange survives as a single line inside the instructions, trimmed to its
   * first sentence, labelled as context rather than topic -- never as a turn, and never in
   * `messages`, which holds exactly one entry.
   *
   * IT USED TO BE DROPPED OUTRIGHT when the new question routed to a different section,
   * on the reasoning that a new section is a new subject. That belt was fastened over a
   * suspender. What caused the defect above was the FULL answer replayed as an `assistant`
   * turn; compressing it to one labelled line inside the instructions is what fixed it,
   * and the gate on top was never the load-bearing half. What the gate cost is the thing
   * MJK is actually asking for: a visitor who asks about JewelAI, then about pricing, then
   * comes back, is a stranger every time, because consecutive questions rarely land on the
   * same section. Two exchanges, whatever they were about -- that is roughly the last two
   * minutes, which is what a person remembers of a conversation they are having.
   *
   * `previousStopId` is still accepted on the wire and no longer read here.
   */
  const recent = history.slice(-2).filter((h) => h.q.trim() && h.a.trim());
  const priorLine = recent.length
    ? `\n\n---\nEarlier in this conversation, for continuity only. The subject of THIS question is the memories above, not these exchanges.\n${recent
        .map((h) => `They asked: ${h.q}\nYou answered: ${priorGist(h.a)}`)
        .join('\n')}`
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
        // The ceiling of last resort. See MAX_OUTPUT_TOKENS: the prompt is what actually
        // decides the length, and this is here so that a prompt the model ignores cannot
        // put five screens of recital into one section of the page.
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
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
      writer.merge(
        withoutErrorParts(result.toUIMessageStream({ sendStart: false, sendFinish: false, sendReasoning: false })),
      );

      const startedAt = Date.now();
      let text = '';
      let rewritten = false;
      try {
        const raw = await result.text;
        text = stripModelArtefacts(raw);
        if (text !== raw) console.warn('[api/ask] stripped model housekeeping from the answer');
        const meta = await result.response;
        /*
         * `finishReason` and the output-token count, because without them nobody could
         * answer the first question MJK asked about this feature: "is that because
         * you've put a token limit on output?"
         *
         * There is a cap now -- MAX_OUTPUT_TOKENS -- and that makes this line more
         * important rather than less. `stop` means the model chose its own ending and the
         * cap was never in play; `length` means the cap fired and the answer below has
         * been backed up to its last full stop. Measured over 19 real calls on 2026-09-03
         * and 20 more on 2026-09-06, every single one came back `stop` -- the second
         * sample uncapped, which is how the cap's value was chosen. If `length` starts
         * appearing here, the prompt's ceiling has stopped working and the number wants
         * re-reading, not raising.
         */
        const [finishReason, usage] = await Promise.all([result.finishReason, result.usage]);
        if (finishReason === 'length') {
          const whole = toLastSentence(text);
          console.warn(
            `[api/ask] the cap fired at ${MAX_OUTPUT_TOKENS} tokens; ` +
              `${text.length} chars backed up to ${whole.length} at the last full stop`,
          );
          text = whole;
        }
        rewritten = text !== raw;
        console.info(
          `[api/ask] ${meta.modelId} answered ${stopId} in ${Date.now() - startedAt} ms ` +
            `finish=${finishReason} out=${usage.outputTokens ?? '?'} chars=${text.length}`,
        );
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
        deps.instrument.outcome('no-model');
        replaceWith(deps.fallbackBlock(stopId, 'provider', hitIds));
        writer.write({ type: 'finish' });
        return;
      }

      const verdict = deps.guard(text, licences, { topLicences: 3 });
      if (verdict.ok) {
        /*
         * What the visitor ended up reading, as a daily figure rather than a `console`
         * line nobody greps. Recorded in each branch and not once from `verdict.ok`,
         * because a failed verdict has two different endings for the reader: salvage kept
         * most of the answer, or salvage kept nothing and the corpus text replaced it.
         * Measured on 2026-09-03, salvage was removing 21% of everything the model wrote
         * and 47% on one question, and nothing in production could have said so.
         */
        deps.instrument.outcome('verified');
        // A clean answer normally carries no body: the visitor keeps the prose that
        // streamed in. But both of the rewrites above happen AFTER the stream, so if the
        // model prefixed its own moderation verdict, or the cap fired and the last
        // sentence was cut short, the visitor has already watched that arrive. Sending
        // the rewritten text as a body replaces what is on screen; without this the strip
        // would sanitise the logs and leave the label -- or the half sentence -- sitting
        // on the page.
        writer.write({
          type: 'data-envelope',
          id: 'envelope',
          data: {
            ...envelope,
            status: 'verified',
            title: dekFor(text, licences),
            // The dek and the tail are the same measurement read from both ends: the memory
            // this answer is most about heads it, the one it is least about follows it.
            cards: nextQuestionFor(text, candidates),
            ...(rewritten ? { body: text } : {}),
          },
        });
      } else {
        console.warn(
          '[api/ask] guard rejected:',
          verdict.violations.map((v) => `${v.kind}: ${v.detail}`).join(' | '),
        );
        const kept = deps.salvage(text, verdict);
        /*
         * How much of the answer the guard took, not just what it objected to.
         *
         * The violation list above says what was wrong; it does not say what the visitor
         * ended up reading. Measured across 18 model answers on 2026-09-03, salvage was
         * removing 21% of everything the model wrote, and on one question -- "give me the
         * full story of the Paxel report" -- 47%, taking two sentences that are
         * near-verbatim from content/memories.yaml with them. That is the largest single
         * cause of MJK's "details are cut short", and it was invisible in production
         * because the only thing on the wire was the verdict, never the magnitude.
         */
        if (kept) {
          console.warn(
            `[api/ask] salvage kept ${kept.text.length} of ${text.length} chars ` +
              `(-${Math.round((100 * (text.length - kept.text.length)) / text.length)}%), ` +
              `${kept.dropped} sentences dropped, ${kept.redacted} numbers redacted`,
          );
        }
        deps.instrument.outcome(kept ? 'salvaged' : 'replaced');
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
              // From what survived, not from what was written: salvage can remove the
              // very sentence the dek was describing -- and, on the other end of the same
              // measurement, can leave a memory looking unused because the sentence that
              // used it was the one the guard took.
              title: dekFor(kept.text, licences),
              cards: nextQuestionFor(kept.text, candidates),
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
