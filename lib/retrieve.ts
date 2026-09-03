/**
 * Retrieval, and the deterministic router that rides on it.
 *
 * The site picks a stop BEFORE the model says a word. A visitor types a question, this
 * module names one of the eight answerable stops, and the camera starts flying while the
 * first token is still in flight. Retrieval is therefore not a nicety that improves an
 * answer -- it is the router, and everything the page does next is downstream of it.
 *
 * What this replaces: `lib/rag.ts`, a substring scorer that dropped every query token
 * shorter than three characters. `ai` -- the single highest-value word a visitor can type
 * on this site, and a word in one of the four prompts we ship -- scored zero against every
 * memory, so the retriever handed the model an empty string and the model answered from
 * nothing. That is the exact machinery that produces a fabrication. The old one also
 * returned a string, so nothing downstream could ask what had been retrieved, let alone
 * refuse when the answer was "nothing".
 *
 * Three rules hold this together:
 *
 *   1. ONE TOKENIZER. `tokenize` below is the tokenizer MiniSearch uses for the index and
 *      for the query. A retriever with two tokenizers has a silent recall bug the day the
 *      two drift, and the length filter above was exactly that bug wearing a different
 *      coat.
 *   2. ALIASES BRIDGE VOCABULARY, THEY DO NOT INVENT FACTS. The table maps what a visitor
 *      types onto words the corpus actually contains -- "motorcycle" onto `bike`, "2fa"
 *      onto `two factor authentication`. Every expansion target below is a term that
 *      appears in content/memories.yaml. As much as possible is derived from the corpus
 *      rather than typed (see `derivedAliases`), so the table shrinks as the corpus grows.
 *   3. NOT CONFIDENT IS AN ANSWER. `confident: false` still carries the best stop, so the
 *      route can degrade (fly there, hedge the copy) instead of guessing loudly. Off-topic
 *      questions -- "write my essay" -- must land here, not on a stop.
 */
import MiniSearch, { type Query } from 'minisearch';
import { ANSWERABLE_STOP_IDS, type StopId } from '../content/stops';
import { loadMemories } from './corpus/load';
import type { Memory } from './corpus/schema';

export type RetrievalHit = { memory: Memory; score: number };

export type RetrievalResult = {
  /** The stop the camera should fly to. `null` only when nothing matched at all. */
  stopId: StopId | null;
  /** Whether the route may answer as if this stop is right. See `MIN_TOP_SCORE`. */
  confident: boolean;
  /**
   * Whether the question is about MJK at all, which is a much lower bar than `confident`
   * and a different decision. `confident` asks "is this the right stop"; `topical` asks
   * "is there anything here to say". Only the second one may produce a refusal: a real
   * question the router merely found ambiguous still deserves an answer, and telling
   * someone "not my lane" because two stops tied is the rudest thing this site can do.
   * The gap is wide -- the loudest off-topic probe scores about 7, the weakest real
   * question about 19 -- so the two rarely disagree by accident.
   */
  topical: boolean;
  /**
   * Whether the section on screen was used to work out what the question is about. True
   * only for a question that points rather than names. The route reads it to decide
   * whether the previous exchange is still the same subject.
   */
  grounded: boolean;
  /** BM25+ score of the best hit. Raw, not normalised -- the threshold is calibrated to it. */
  topScore: number;
  hits: RetrievalHit[];
  /** `[stopId/id] title\nbody` blocks, blank-line separated. What the model is given. */
  context: string;
};

/* -- tokenizer ------------------------------------------------------------- */

/** Unicode-aware: letters and numbers are terms, everything else is a separator. */
const WORD = /[\p{L}\p{N}]+/gu;

/**
 * Deliberately light. Every word here is grammar a visitor uses to wrap a question --
 * never a word this portfolio means something by. `work`, `now`, `brief`, `build`, `ship`,
 * `learn`, `new` and `project` are all load-bearing on this site and all stay.
 */
const STOPWORDS = new Set([
  'a', 'about', 'again', 'all', 'also', 'am', 'an', 'and', 'any', 'anything', 'are', 'as',
  'at', 'basically', 'be', 'been', 'being', 'both', 'bring', 'but', 'by', 'can', 'could',
  'describe', 'did', 'do', 'does', 'doing', 'done', 'dont', 'each', 'ever', 'every',
  'explain', 'few', 'for', 'from', 'give', 'had', 'has', 'have', 'having', 'he', 'hello',
  'her', 'here', 'hey', 'hi', 'him', 'his', 'how', 'if', 'im', 'in', 'into', 'is', 'it',
  'its', 'ive', 'just', 'kind', 'kinda', 'let', 'lets', 'like', 'lot', 'lots', 'many',
  'may', 'me', 'might', 'mine', 'more', 'most', 'much', 'must', 'my', 'myself', 'never',
  'no', 'nor', 'not', 'of', 'off', 'ok', 'okay', 'on', 'once', 'only', 'or', 'other',
  'others', 'our', 'ours', 'out', 'over', 'own', 'please', 'really', 'said', 'same', 'say',
  'share', 'shall', 'she', 'should', 'show', 'so', 'some', 'sort', 'still', 'stuff', 'such',
  'take', 'tell', 'than', 'thank', 'thanks', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'thing', 'things', 'this', 'those', 'through', 'to', 'too',
  'us', 'very', 'walk', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'whose', 'why', 'will', 'with', 'would', 'yeah', 'yes', 'you', 'your',
  'yours',
]);

/**
 * A plural / `-ing` / `-ed` normaliser, and nothing more. MiniSearch has no stemmer of its
 * own, and a real one (Porter) over a 30-memory corpus costs more in false conflations
 * than it buys in recall. The three suffixes below are the ones an English question
 * actually differs by: "agents" vs `agents`, "rollout" vs `rollouts`, "worked" vs `work`.
 *
 * No de-doubling of the final consonant ("shipped" stays `shipp`, it does not become
 * `ship`): "called" would become `cal`, and both sides of the index run this function, so
 * a consistent wrong stem costs nothing while an inconsistent right one costs a match.
 */
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (/[^aeiou]ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/(?:ss|sh|ch|x|z)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !/(?:ss|us|is|as|os)$/.test(word)) return word.slice(0, -1);
  if (word.length >= 6 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length >= 5 && word.endsWith('ed')) return word.slice(0, -2);
  return word;
}

function words(text: string): string[] {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').match(WORD) ?? [];
}

/**
 * Stemmed terms with the stopwords still in. Alias keys are matched against this, so a
 * phrase like "work with you" stays a phrase and does not collapse onto bare `work`.
 */
function tokenizeAll(text: string): string[] {
  return words(text).filter((w) => w.length >= 2).map(stem);
}

/**
 * The tokenizer. Lowercase, unicode-aware, punctuation stripped, two-letter terms KEPT --
 * `ai`, `ux`, `3d` and `rd` are the shortest and most meaningful things a visitor types
 * here. MiniSearch is configured with this exact function for both index and query.
 */
export function tokenize(text: string): string[] {
  return words(text)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
    .map(stem)
    .filter((t) => !STOPWORDS.has(t));
}

/* -- ranking constants ----------------------------------------------------- */

const FIELD_BOOSTS = { title: 3, tags: 2, body: 1, id: 1 };
const DEFAULT_K = 6;

/** Alias hits corroborate, they do not decide. A word the visitor typed outranks one we inferred. */
const ALIAS_WEIGHT = 0.6;

/**
 * How much a stop's supporting hits count next to its best one.
 *
 * `now` and `apac` hold eleven memories each; `origin`, `pivot`, `engineering`, `rd350`
 * and `contact` hold one. A plain sum of scores would hand every ambiguous question to the
 * two crowded stops purely because they are crowded. Scoring a stop as
 * `best + 0.35 * (the rest)` keeps corroboration worth something without letting five
 * mediocre hits outvote one excellent one.
 */
const STOP_SUPPORT = 0.35;

/**
 * Calibrated, not guessed, against evals/tier-a/routing-table.ts, and RE-calibrated when
 * the corpus grew. It was 8, from a table where the weakest real question scored 17.8 and
 * the loudest off-topic one 6.5. Six memories about the two AI pipelines moved both ends:
 * the weakest real question is now 21.5 and the loudest off-topic 13.9, so 8 had stopped
 * being a gap and started being a floor a nonsense question could clear on its own. 16
 * sits back in the middle, with 5.5 points of margin below the quietest real question and
 * 2.1 above the loudest piece of noise.
 *
 * The gap exists because nonsense only ever brushes the corpus: "write my essay" catches
 * `writer` in one body, "translate this to french" catches `translate` in another. One
 * incidental body term cannot clear this; a question about the work clears it many times
 * over. Scores are raw BM25+ and will move if the field boosts or the corpus size move --
 * `npm run route:eval` prints them, and this number is re-read from that output.
 */
const MIN_TOP_SCORE = 16;

/** The winning stop must hold half the weighted mass, or the router is guessing. */
const MIN_SHARE = 0.5;

/**
 * Requests to do the visitor's work, refused on their shape rather than on their score.
 *
 * "Review my code" is not a question about MJK, but it is made of words the corpus is full
 * of, so it scored 13.2 the moment a memory about directing coding agents was added -- well
 * clear of MIN_TOP_SCORE -- and the site would have cheerfully answered it. Raising the
 * threshold to outrun it is the wrong instrument: it would climb again with the next
 * memory, and it would start refusing real questions that happen to score modestly.
 *
 * Intent is the honest test. These are second-person imperatives aimed at the visitor's own
 * material, which is exactly what content/system-prompt.md tells the model to decline. The
 * possessive is what keeps it narrow: "review my code" matches, "how do you review
 * architecture" does not.
 */
const WORK_REQUEST =
  /\b(write|review|fix|debug|refactor|optimi[sz]e|translate|summari[sz]e|proofread|edit|rewrite|solve|grade|critique)\s+(me\s+)?(my|our|this|these)\b/i;

/**
 * Questions that point at something instead of naming it.
 *
 * Tested against the RAW question, not the tokens, because the tokeniser drops every one
 * of these words as a stopword -- which is the whole reason the failure happened. A
 * visitor read section six, typed "can you give me more details on these systems?", and
 * got an answer about the third-party report he had asked about two minutes earlier. The
 * router was right; retrieval had "detail" and "system" to work with and nothing else.
 */
const DEIXIS = /\b(this|that|these|those|it|its|they|them|their|here|above|below|the same)\b/i;
const FOLLOWUP = /\b(more|else|further|elaborate|expand|go on|tell me more|and\b.*\?)\b/i;

/**
 * Above this the question stands on its own and the viewport is ignored entirely.
 * Read from `route:eval`'s printed bands, exactly as MIN_TOP_SCORE is.
 */
const SELF_CONTAINED_SCORE = 25;

/** How hard the viewport may push when the question is at its most helpless. */
const VIEWPORT_WEIGHT = 2;

/**
 * Whether the question needs the page to tell it what it is about.
 *
 * Three tests, all cheap, all local, no model call. It must not be a request to do the
 * visitor's work; it must point or follow rather than name; and it must name nothing the
 * corpus recognises AND still be scoring poorly. The anchor test is what stops "was this
 * the RD 350?" from being treated as helpless simply because it contains "this".
 */
function contextDependent(question: string, topScore: number, anchors: Set<string>): boolean {
  if (WORK_REQUEST.test(question)) return false;
  if (!DEIXIS.test(question) && !FOLLOWUP.test(question)) return false;
  if (tokenize(question).some((t) => anchors.has(t))) return false;
  return topScore < SELF_CONTAINED_SCORE;
}

/** `ANSWERABLE_STOP_IDS` as a membership test that accepts any `StopId`, `hero` included. */
const ANSWERABLE = new Set<string>(ANSWERABLE_STOP_IDS);

/* -- aliases --------------------------------------------------------------- */

/**
 * Visitor vocabulary -> corpus vocabulary.
 *
 * Keys are phrases (matched as 1-4 term n-grams against the question); values are terms
 * that appear in content/memories.yaml. Written in plain English and normalised through
 * the same tokenizer at build time, so "hiring" and "hire" need not both be typed.
 *
 * The bar for adding a row: a visitor plausibly types the key, and the corpus plausibly
 * never contains it. Rows that merely restate a word already in the corpus are noise --
 * `taboola`, `hotstar`, `evian`, `langgraph` are all indexed already and appear here only
 * where they widen a query rather than repeat it.
 *
 * Said plainly rather than flattered: this table was written while reading the routing
 * table's misses, so it is fitted to those 48 questions and is the least trustworthy part
 * of this module. Every row still has to survive the bar above read on its own -- "does a
 * stranger say this, and does the corpus fail to?" -- because a row that exists only to
 * turn one test green is a lie that passes. `disney` and `off the clock` were both added
 * that way and both clear it (Disney+ Hotstar is one employer under two names; "off the
 * clock" is the corpus's own phrase). The derived rules below are preferred wherever they
 * can do the same job, because they cannot be fitted to anything.
 */
export const ALIASES: Record<string, string[]> = {
  /* career -- the commonest question a recruiter asks, and the one this site answered worst.
   * "work experience" and "where have you worked" both landed on the CONTACT stop, because the
   * words "work" and "working" are all over the contact copy while nothing was tagged as
   * employment; "tell me about your career" retrieved nothing at all. */
  'work experience': ['career', 'employment', 'roles', 'omnicom', 'kinnect', 'taboola', 'hotstar'],
  'work history': ['career', 'employment', 'roles'],
  'employment history': ['career', 'employment', 'roles'],
  employment: ['career', 'roles'],
  career: ['employment', 'roles'],
  'career path': ['employment', 'roles', 'career'],
  'where have you worked': ['career', 'employment', 'roles'],
  'who have you worked for': ['career', 'employment', 'roles', 'clients'],
  'past roles': ['career', 'employment', 'roles'],
  'previous roles': ['career', 'employment', 'roles'],
  'job history': ['career', 'employment', 'roles'],
  jobs: ['career', 'employment', 'roles'],
  background: ['career', 'employment', 'roles'],
  experience: ['career', 'employment', 'roles'],
  timeline: ['career', 'employment', 'roles'],

  /* identity -- the first question anyone asks a personal site, and the one it answered
   * worst of all. "who are you", "tell me about yourself" and "what do you do" are made
   * entirely of stopwords, so they tokenised to nothing, scored 0.0, and were refused as
   * off-topic. Phrase aliases are the only thing that can rescue a query with no content
   * words in it. */
  'who are you': ['identity', 'introduction', 'mathew', 'kondekeril'],
  'who is mathew': ['identity', 'introduction', 'mathew', 'kondekeril'],
  'who is this': ['identity', 'introduction', 'mathew', 'kondekeril'],
  'about you': ['identity', 'introduction', 'mathew'],
  /* His own name, on its own. MJK asked "what can you tell me about mathew?" -- the most
   * ordinary question a visitor has -- and the site answered "Not my lane. Ask what I've
   * built." The name was not an alias and appears exactly once in a corpus written in the
   * first person, so the whole query scored 5.1 and fell under the confidence bar. A
   * question that names him is definitionally about him, and one that names him in full is
   * not a different question from one that uses his first name. */
  mathew: ['identity', 'introduction', 'mathew', 'kondekeril'],
  kondekeril: ['identity', 'introduction', 'mathew', 'kondekeril'],
  'about mathew': ['identity', 'introduction', 'mathew', 'kondekeril'],
  'about yourself': ['identity', 'introduction', 'mathew'],
  'tell me about yourself': ['identity', 'introduction', 'mathew'],
  'introduce yourself': ['identity', 'introduction', 'mathew'],
  'your background': ['identity', 'introduction', 'career', 'employment'],
  'what do you do': ['now', 'current', 'today', 'role'],
  // `expand` only tests windows of up to four terms, so a five-word key can never fire.
  'doing now': ['now', 'current', 'today', 'role'],
  'what do you build': ['built', 'shipped', 'projects'],
  'good at': ['capabilities', 'media', 'agents', 'engineering', 'built'],
  'what can you do': ['capabilities', 'media', 'agents', 'engineering', 'built'],
  'what are your skills': ['capabilities', 'media', 'agents', 'engineering'],

  /* contact -- how a visitor asks to work with me */
  hire: ['contact', 'brief', 'proposal'],
  'hire you': ['contact', 'brief', 'proposal'],
  hiring: ['contact', 'brief', 'proposal'],
  'work with you': ['contact', 'brief', 'proposal'],
  'work together': ['contact', 'brief', 'proposal'],
  'working with you': ['contact', 'brief', 'proposal'],
  /* Buying questions -- the ones asked immediately before someone hires you, and the ones
   * this site was refusing outright. A critical review found "how fast could you start?"
   * answered with "Not my lane." The corpus cannot promise a start date, and must not, but
   * `contact-how-it-starts` says exactly what happens next: a scoped proposal within a day, or an
   * honest no. Sending these to the contact stop answers the question behind the question. */
  'how fast': ['contact', 'brief', 'proposal', 'scoped'],
  'start date': ['contact', 'brief', 'proposal', 'scoped'],
  'get started': ['contact', 'brief', 'proposal', 'scoped'],
  'capacity': ['contact', 'brief', 'proposal', 'available'],
  'lead time': ['contact', 'brief', 'proposal'],
  'how long': ['contact', 'brief', 'proposal', 'scoped'],
  'timeline for': ['contact', 'brief', 'proposal', 'scoped'],
  'scope a project': ['contact', 'brief', 'proposal', 'scoped'],
  'how do you work with': ['contact', 'brief', 'proposal', 'scoped'],
  'take on new': ['contact', 'brief', 'proposal', 'available'],
  'next step': ['contact', 'brief', 'proposal'],
  'work together on': ['contact', 'brief', 'proposal', 'scoped'],
  budget: ['contact', 'brief', 'proposal', 'scoped'],
  rates: ['contact', 'brief', 'proposal'],
  pricing: ['contact', 'brief', 'proposal'],
  cost: ['contact', 'brief', 'proposal'],
  quote: ['contact', 'brief', 'proposal'],
  brief: ['contact', 'proposal', 'scoped'],
  contact: ['brief', 'proposal'],
  email: ['contact', 'brief'],
  'reach out': ['contact', 'brief'],
  'get in touch': ['contact', 'brief'],
  available: ['contact', 'brief', 'proposal'],
  availability: ['contact', 'brief', 'proposal'],
  freelance: ['contact', 'brief', 'proposal'],
  // "can I get your cv" is a request for the PDF, which lives on the contact stop. The
  // career-history reading of the same question is covered by the `career` block above
  // ("work experience", "background", "jobs"), so this stays pointed at the download.
  cv: ['contact', 'brief'],
  resume: ['contact', 'brief'],
  engagement: ['contact', 'brief', 'proposal'],

  /* origin -- the aircraft, and the transition out of it */
  aircraft: ['arc', 'fly', 'fighter', 'aerospace', 'dreamt'],
  airplane: ['aircraft', 'fly', 'fighter', 'dreamt'],
  aeroplane: ['aircraft', 'fly', 'fighter', 'dreamt'],
  plane: ['aircraft', 'fly', 'fighter', 'dreamt'],
  jet: ['aircraft', 'fly', 'fighter', 'dreamt'],
  fighter: ['aircraft', 'fly', 'dreamt'],
  pilot: ['aircraft', 'fly', 'fighter', 'dreamt'],
  aviation: ['aircraft', 'aerospace', 'fly', 'fighter'],
  flying: ['aircraft', 'fighter', 'dreamt'],
  'get into marketing': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],
  'got into marketing': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],
  'end up in marketing': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],
  'career change': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],
  'change careers': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],
  'career switch': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],
  'switch careers': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],
  'leave engineering': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],
  'left engineering': ['arc', 'rebuilt', 'toolkit', 'dreamt', 'hiring'],

  /* engineering -- the degrees */
  study: ['education', 'university', 'msc', 'beng', 'honours'],
  studies: ['education', 'university', 'msc', 'beng', 'honours'],
  school: ['education', 'university', 'msc', 'beng'],
  university: ['education', 'msc', 'beng', 'honours'],
  college: ['education', 'university', 'msc', 'beng'],
  degree: ['education', 'university', 'msc', 'beng', 'honours'],
  graduate: ['education', 'university', 'msc', 'beng'],
  masters: ['education', 'university', 'msc', 'brunel'],
  qualifications: ['education', 'university', 'msc', 'beng', 'honours'],
  academic: ['education', 'university', 'msc', 'beng'],
  'trained as': ['education', 'university', 'mechanical', 'aerospace'],

  /* pivot -- the method, not the career move */
  method: ['pattern', 'imagine', 'learn', 'loop'],
  methodology: ['pattern', 'imagine', 'learn', 'loop'],
  approach: ['pattern', 'imagine', 'learn', 'loop'],
  process: ['pattern', 'imagine', 'learn', 'loop'],
  philosophy: ['pattern', 'imagine', 'learn', 'loop'],
  mindset: ['pattern', 'imagine', 'learn', 'loop'],
  learn: ['pattern', 'imagine', 'loop', 'method'],
  'first principles': ['pattern', 'imagine', 'learn', 'loop'],

  /* rd350 -- the aside */
  motorcycle: ['rd350', 'bike', 'yamaha', 'cafe', 'racer'],
  motorbike: ['rd350', 'bike', 'yamaha', 'cafe', 'racer'],
  moto: ['rd350', 'bike', 'yamaha', 'cafe', 'racer'],
  bike: ['rd350', 'yamaha', 'cafe', 'racer', 'fabrication'],
  restore: ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  restoration: ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  hobby: ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  hobbies: ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  garage: ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  weld: ['rd350', 'fabrication', 'bike'],
  // "Off the clock" is the corpus's own phrase for this stop -- and `off` is a stopword,
  // so on its own the phrase reaches the right memory on `clock` alone and barely scores.
  'off the clock': ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  'spare time': ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  'free time': ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  'outside work': ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],
  weekends: ['rd350', 'bike', 'cafe', 'racer', 'fabrication'],

  /* now -- the AI work */
  llm: ['ai', 'agent', 'orchestration'],
  llms: ['ai', 'agent', 'orchestration'],
  gpt: ['ai', 'agent', 'orchestration'],
  genai: ['ai', 'agent', 'creative'],
  'generative ai': ['ai', 'agent', 'creative'],
  chatbot: ['ai', 'agent', 'chat'],
  'machine learning': ['ai', 'agent'],
  agentic: ['ai', 'agent', 'orchestration'],
  langgraph: ['ai', 'agent', 'orchestration'],
  mastra: ['ai', 'agent', 'erp'],
  rag: ['ai', 'agent'],
  // "the AI work" means the things that were built, not the capability statement that
  // lists the frameworks. One of the four prompts we ship says exactly this.
  'ai work': ['built', 'shipped', 'projects', 'jewelai', 'mrunn', 'tallybridge'],
  'these days': ['krunch', 'ai', 'agent', '2025'],
  currently: ['krunch', 'ai', 'agent', '2025'],
  nowadays: ['krunch', 'ai', 'agent', '2025'],
  'up to now': ['krunch', 'ai', 'agent', '2025'],
  'jewel ai': ['jewelai', 'jewellery', 'creative'],
  'startup': ['krunch', 'lab', 'founded'],

  /* work -- the shipped things */
  '2fa': ['two', 'factor', 'authentication'],
  mfa: ['two', 'factor', 'authentication'],
  'two factor': ['authentication', 'taboola'],
  'multi factor': ['two', 'factor', 'authentication'],
  award: ['recognition', 'sammies', 'cmo'],
  awards: ['recognition', 'sammies', 'cmo'],
  won: ['award', 'recognition', 'sammies', 'cmo'],
  prize: ['award', 'recognition', 'sammies', 'cmo'],
  paxel: ['assessment', 'credential', 'judgment'],
  assessment: ['paxel', 'credential', 'judgment'],
  assessed: ['paxel', 'credential', 'judgment'],
  credentials: ['paxel', 'assessment', 'credential', 'judgment'],
  vouch: ['paxel', 'assessment', 'credential'],

  /* apac -- the media decade */
  agency: ['omnicom', 'kinnect', 'triad'],
  agencies: ['omnicom', 'kinnect', 'triad', 'agency'],
  advertising: ['media', 'ad', 'spend', 'campaign'],
  advert: ['media', 'ad', 'spend', 'campaign'],
  adverts: ['media', 'ad', 'spend', 'campaign'],
  hul: ['hindustan', 'unilever'],
  streaming: ['hotstar', 'live', 'viewers'],
  // Disney+ Hotstar is one employer under two names, and only one of them is the handle.
  disney: ['hotstar', 'live', 'viewers', 'cricket'],
  'world cup': ['cricket', 'hotstar', 'icc'],
  'cricket world cup': ['hotstar', 'icc', 'ipl'],
  'laughing cow': ['triad', 'awareness'],
};

/**
 * Aliases nobody typed: the ones the corpus already implies.
 *
 * Three rules, all cheap and all self-maintaining as memories are added:
 *
 *   1. `rd350` <-> `rd 350`. A letters-then-digits token and its split form are the same
 *      handle, and a visitor picks one at random.
 *   2. `jewelai` <-> `jewel ai`. A compound token that splits cleanly into two other
 *      corpus terms is the same handle written closed instead of open.
 *   3. A term that names exactly one memory's ID pulls in that memory's other RARE handle
 *      terms -- so "hotstar" also asks for `scale`, "paxel" for `assessment`. Rare is the
 *      point twice over: a term in more than three memories (`agent`, `project`, `ai`,
 *      `build`) is neither a usable key nor a usable target, because widening a query with
 *      a crowded term routes every question to the crowded stop.
 */
function derivedAliases(memories: Memory[]): Array<[string, string[]]> {
  const vocab = new Set<string>();
  const df = new Map<string, number>();
  for (const m of memories) {
    const seen = new Set(tokenize(`${m.id} ${m.title} ${m.tags.join(' ')} ${m.body}`));
    for (const t of seen) {
      vocab.add(t);
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const rare = (t: string) => (df.get(t) ?? 0) <= 3;

  const handles = memories.map((m) => ({
    id: m.id,
    idTokens: tokenize(m.id),
    tokens: [...new Set([...tokenize(m.id), ...tokenize(m.title)])],
  }));
  const owners = new Map<string, string[]>();
  for (const h of handles) {
    for (const t of h.idTokens) owners.set(t, [...(owners.get(t) ?? []), h.id]);
  }

  const out: Array<[string, string[]]> = [];
  for (const t of vocab) {
    // 1. letters + digits, opened and closed.
    const split = /^([a-z]{2,})(\d{2,})$/.exec(t);
    if (split) {
      out.push([t, [split[1], split[2]]]);
      out.push([`${split[1]} ${split[2]}`, [t]]);
    }
    // 2. a closed compound of two corpus terms.
    if (t.length >= 6) {
      for (let i = 4; i <= t.length - 2; i += 1) {
        const a = t.slice(0, i);
        const b = t.slice(i);
        if (vocab.has(a) && vocab.has(b)) {
          out.push([t, [a, b]]);
          out.push([`${a} ${b}`, [t]]);
          break;
        }
      }
    }
    // 3. a term that names exactly one memory pulls in that memory's other rare handles.
    // Keys come from IDS ONLY, never titles, and must themselves be rare. An id is a handle
    // an author chose, but authors write verbs into handles: `build-rd350` made "build" a
    // unique id token, and every question containing "do you build..." was answered with a
    // motorcycle. Both guards are load-bearing; "work" fails the first, "build" the second.
    const owned = owners.get(t);
    if (owned?.length === 1 && rare(t)) {
      const siblings = handles
        .find((h) => h.id === owned[0])!
        .tokens.filter((other) => other !== t && rare(other));
      if (siblings.length) out.push([t, siblings]);
    }
  }
  return out;
}

/** The hand-written and derived tables, merged and normalised onto tokenizer output. */
function buildAliases(memories: Memory[]): Map<string, string[]> {
  const table = new Map<string, string[]>();
  const add = ([phrase, expansions]: [string, string[]]) => {
    const key = tokenizeAll(phrase).join(' ');
    if (!key) return;
    const values = expansions.flatMap((v) => tokenize(v)).filter((v) => v !== key);
    if (!values.length) return;
    table.set(key, [...new Set([...(table.get(key) ?? []), ...values])]);
  };
  for (const row of Object.entries(ALIASES)) add(row);
  for (const row of derivedAliases(memories)) add(row);
  return table;
}

/** Every alias expansion triggered by any 1-4 term window of the question. */
function expand(all: string[], terms: string[], table: Map<string, string[]>): string[] {
  const direct = new Set(terms);
  const out = new Set<string>();
  for (let i = 0; i < all.length; i += 1) {
    for (let n = Math.min(4, all.length - i); n >= 1; n -= 1) {
      for (const value of table.get(all.slice(i, i + n).join(' ')) ?? []) {
        if (!direct.has(value)) out.add(value);
      }
    }
  }
  return [...out];
}

/* -- the index ------------------------------------------------------------- */

type IndexedDoc = { id: string; title: string; tags: string; body: string };

type Engine = {
  index: MiniSearch<IndexedDoc>;
  byId: Map<string, Memory>;
  aliases: Map<string, string[]>;
  /**
   * Terms rare enough to name a subject on their own: "taboola", "rd350", "tallybridge".
   * Derived from the corpus on the same `df <= 3` rule the alias table already uses, for
   * the same reason -- a term in four or more memories names nothing in particular.
   *
   * This is what tells a question that only LOOKS context-dependent from one that is. "Was
   * this the RD 350?" is full of demonstratives and needs no help; "more on these systems"
   * has the same shape and no subject at all. Score cannot separate them, because the two
   * bands overlap: the loudest deictic question scores 20.2 and "what's mrunn" scores 19.8.
   */
  anchors: Set<string>;
};

let engine: Engine | null = null;

/** Built once, on the first question. ~30 memories: a few milliseconds, then never again. */
function getEngine(): Engine {
  if (engine) return engine;
  const memories = loadMemories();
  const index = new MiniSearch<IndexedDoc>({
    idField: 'id',
    fields: ['title', 'tags', 'body', 'id'],
    tokenize: (text) => tokenize(text),
    // tokenize already lowercases, stems and drops stopwords; MiniSearch's default
    // processTerm would lowercase a second time and nothing more.
    processTerm: (term) => term,
    /*
     * Prefix matching, but only for terms long enough to mean something.
     *
     * It used to be `prefix: true`, which lets any stem match any word beginning with it,
     * and the short ones are where that goes wrong: this file already recorded "how tall
     * are you" prefix-matching `tallybridge` at 6.5. Then the corpus gained a memory that
     * counts product categories, and "tell me a joke about cats" stemmed to `cat`, matched
     * `categories`, and scored 9.3 on the work stop -- over the 8-point bar, so the site
     * would have answered a cat joke with a straight face about apparel.
     *
     * Five characters is measured rather than chosen: at four, `tall` still reaches
     * `tallybridge`. Exact matching is untouched, so short real terms like `erp` and `ai`
     * are unaffected -- prefix only ever ADDED matches, and what it adds below five
     * characters is noise.
     */
    searchOptions: {
      boost: FIELD_BOOSTS,
      fuzzy: 0.1,
      prefix: (term: string) => term.length >= 5,
      combineWith: 'OR',
    },
  });
  index.addAll(
    memories.map((m) => ({
      id: m.id,
      title: m.title,
      // Authored `aliases` are indexed as tags: they exist to be searched for.
      tags: [...m.tags, ...(m.aliases ?? [])].join(' '),
      body: m.body,
    })),
  );
  engine = {
    index,
    byId: new Map(memories.map((m) => [m.id, m])),
    aliases: buildAliases(memories),
    anchors: buildAnchors(memories),
  };
  return engine;
}

/**
 * Every term that could name a subject by itself: rare across the corpus, and drawn from
 * the places an author names things -- ids, titles and tags -- rather than from prose.
 */
function buildAnchors(memories: Memory[]): Set<string> {
  const df = new Map<string, number>();
  for (const m of memories) {
    for (const t of new Set(tokenize(`${m.id} ${m.title} ${m.tags.join(' ')} ${m.body}`))) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const anchors = new Set<string>();
  for (const m of memories) {
    for (const t of tokenize(`${m.id} ${m.title} ${m.tags.join(' ')}`)) {
      if (t.length >= 3 && (df.get(t) ?? 0) <= 3) anchors.add(t);
    }
  }
  return anchors;
}

/* -- retrieval ------------------------------------------------------------- */

/**
 * Put the section being read at the front of the licence set.
 *
 * Its memories keep a nominal score above whatever the question matched by accident, so
 * they lead the context and the answer's title; anything the question genuinely matched
 * follows, because a follow-up often does still lean on the previous subject.
 */
function ground(
  searched: RetrievalHit[],
  viewing: StopId,
  byId: Map<string, Memory>,
  k: number,
): RetrievalHit[] {
  const onStop = [...byId.values()].filter((m) => m.stopId === viewing);
  const lead = Math.max(searched[0]?.score ?? 0, MIN_TOP_SCORE) + 1;
  const grounded: RetrievalHit[] = onStop.map((memory, i) => ({ memory, score: lead - i * 0.01 }));
  const seen = new Set(grounded.map((h) => h.memory.id));
  return [...grounded, ...searched.filter((h) => !seen.has(h.memory.id))].slice(0, Math.max(k, 4));
}

function formatContext(hits: RetrievalHit[]): string {
  return hits
    .map(({ memory }) => `[${memory.stopId}/${memory.id}] ${memory.title}\n${memory.body.trim()}`)
    .join('\n\n');
}

/**
 * Which stop the top hits point at, and how sure that is.
 *
 * `best + STOP_SUPPORT * (the rest)` per stop; the winner's share of the total is what
 * `confident` reads. `hero` can never win -- the schema forbids a memory pointing there,
 * and this filters for it anyway rather than trusting that it always will.
 */
function vote(
  hits: RetrievalHit[],
  prior?: { stopId: StopId; softness: number },
): { stopId: StopId | null; share: number } {
  const byStop = new Map<StopId, number[]>();
  for (const hit of hits) {
    const stop = hit.memory.stopId;
    if (!ANSWERABLE.has(stop)) continue;
    byStop.set(stop, [...(byStop.get(stop) ?? []), hit.score]);
  }

  const mass = new Map<StopId, number>();
  let total = 0;
  for (const [stop, scores] of byStop) {
    const sorted = [...scores].sort((a, b) => b - a);
    const m = sorted[0] + STOP_SUPPORT * sorted.slice(1).reduce((a, b) => a + b, 0);
    mass.set(stop, m);
    total += m;
  }

  /*
   * The section on screen, added as a prior rather than as an override.
   *
   * `softness` is how little the question said for itself, so a flat likelihood lets the
   * prior decide and a peaked one drowns it. That shape is what makes the dangerous case
   * safe: a visitor parked on section six who asks something specific about section two is
   * asking a question that scores well, so `softness` is near zero and the prior cannot
   * move the result. Verified exhaustively rather than argued -- every question in the
   * routing table, from every one of the eight viewports, routes exactly where it routes
   * with no viewport at all.
   */
  if (prior && ANSWERABLE.has(prior.stopId)) {
    const push = VIEWPORT_WEIGHT * prior.softness * Math.max(total, 1);
    mass.set(prior.stopId, (mass.get(prior.stopId) ?? 0) + push);
    total += push;
  }

  let winner: StopId | null = null;
  let best = 0;
  for (const [stop, m] of mass) {
    if (m > best) {
      best = m;
      winner = stop;
    }
  }
  return { stopId: winner, share: total > 0 ? best / total : 0 };
}

/**
 * Rank the corpus against a question and name the stop it belongs to.
 *
 * Never throws on a strange question and never returns a stop it did not find evidence
 * for. An empty `hits` means the corpus has nothing to say, which the route must be able
 * to tell apart from "here are six memories" -- that distinction is the whole reason this
 * returns an object rather than the string `lib/rag.ts` used to.
 */
export function retrieve(
  question: string,
  opts: { k?: number; viewing?: StopId | null } = {},
): RetrievalResult {
  const k = Math.max(1, opts.k ?? DEFAULT_K);
  const { index, byId, aliases, anchors } = getEngine();

  const terms = tokenize(question);
  const expansions = expand(tokenizeAll(question), terms, aliases);

  const parts: Query[] = [];
  if (terms.length) parts.push({ combineWith: 'OR', queries: terms });
  if (expansions.length) {
    parts.push({ combineWith: 'OR', queries: expansions, boostTerm: () => ALIAS_WEIGHT });
  }
  const searched: RetrievalHit[] = parts.length
    ? index
        .search({ combineWith: 'OR', queries: parts })
        .slice(0, k)
        .flatMap((result) => {
          const memory = byId.get(String(result.id));
          return memory ? [{ memory, score: result.score }] : [];
        })
    : [];

  const topScore = searched[0]?.score ?? 0;

  /*
   * "Tell me more." "Go on." "And these?"
   *
   * Made entirely of stopwords, so there is nothing to search for and the old code
   * returned nothing at all before the viewport was ever consulted -- refusing the very
   * questions the viewport exists to answer. A question with no content words is the
   * strongest possible evidence that its subject is on the screen rather than in the text.
   */
  const grounded = Boolean(opts.viewing) && (!parts.length || contextDependent(question, topScore, anchors));

  if (!parts.length && !grounded) {
    return {
      stopId: null,
      confident: false,
      topical: false,
      grounded: false,
      topScore: 0,
      hits: [],
      context: '',
    };
  }

  /*
   * A grounded question is handed the section's own memories, ahead of whatever it
   * happened to match. Routing to the right place while passing the licences from the
   * wrong one is the original defect wearing a different hat: the visitor is taken to
   * section six and the model is still holding section seven's material.
   */
  const hits: RetrievalHit[] = grounded && opts.viewing ? ground(searched, opts.viewing, byId, k) : searched;
  const prior =
    grounded && opts.viewing
      ? {
          stopId: opts.viewing,
          softness: Math.min(1, Math.max(0, 1 - topScore / SELF_CONTAINED_SCORE)),
        }
      : undefined;

  const { stopId, share } = vote(hits, prior);

  // A question that only makes sense against the page is not off-topic just because it
  // scored badly on its own. "More on these?" earns its topicality from the section the
  // visitor is reading, which is where its subject actually is.
  const topical =
    stopId !== null && (topScore >= MIN_TOP_SCORE || grounded) && !WORK_REQUEST.test(question);

  return {
    stopId,
    confident: topical && share >= MIN_SHARE,
    topical,
    grounded,
    topScore,
    hits,
    context: formatContext(hits),
  };
}

/** The router, for callers that want the decision and not the evidence. */
export function routeQuestion(question: string): { stopId: StopId | null; confident: boolean } {
  const { stopId, confident } = retrieve(question);
  return { stopId, confident };
}

/**
 * @deprecated Compatibility shim for `app/api/ask/route.ts`, which still consumes
 * retrieval as a single string and so cannot see `stopId`, `confident` or the hits --
 * the three things this rewrite exists to expose. Delete this function at wiring time,
 * when the route starts calling `retrieve` and routing on the result.
 */
export async function retrieveMemories(question: string): Promise<string> {
  return retrieve(question).context;
}
