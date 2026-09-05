/**
 * The routing table: what a visitor types, and the stop the site owes them.
 *
 * This is the spec for `lib/retrieve.ts`, written as data so two things can read it --
 * `routing.test.ts`, which fails CI below the accuracy bar, and `scripts/route-eval.ts`,
 * which prints the whole thing with scores so a human can see WHICH questions are wrong
 * rather than only how many. A router is judged on its misses, and a bare percentage hides
 * them.
 *
 * Rules for adding a row:
 *
 *   - Write the question a visitor would actually type, lowercase and unpunctuated if that
 *     is how people type. Do not write the question that happens to match the corpus.
 *   - The expected stop is the one a person who has read content/memories.yaml would send
 *     it to. Where the corpus genuinely puts the answer somewhere other than the obvious
 *     stop, fix the EXPECTATION and say why in a comment -- never widen an alias until the
 *     table goes green. An alias tuned to a test is a lie that passes.
 */
import type { StopId } from '../../content/stops';

export type RoutingCase = { question: string; stopId: StopId };

const cases = (stopId: StopId, ...questions: string[]): RoutingCase[] =>
  questions.map((question) => ({ question, stopId }));

export const ROUTING_TABLE: RoutingCase[] = [
  // -- work: the things that got built -------------------------------------
  // The stop is "Selected work", so it holds the built things, not the employers.
  // Taboola's rollouts moved to `apac` with the rest of the employment record when the
  // career timeline was introduced; a question about a job goes to the career, a
  // question about a product goes here.
  ...cases(
    'work',
    "what's mrunn",
    'tell me about jewelai studio',
    'do you build multi agent systems',
    "what's tallybridge",
    'who is artha',
    'show me the ai work',
    'what have you built',
    'which awards have you won',
    'what did paxel say about your engineering',
    'who assessed your agent orchestration',
  ),

  // -- apac: the career, and the media decade ------------------------------
  ...cases(
    'apac',
    'who did you work for at omnicom',
    'hotstar cricket world cup',
    'what did you do at kinnect',
    'tell me about the evian campaign',
    'what is nanomark solutions',
    'what results did you get for the laughing cow',
    'which brands have you run paid media for',
    'what did you do at the triad co',
    'rustomjee real estate leads',
    'what did you do at disney',
    'what did you ship at taboola',
    'What actually shipped at Taboola?',
    '2fa rollout',
    'tell me about the two-factor authentication launch',
    'did you launch payments in korea and indonesia',
    // The questions a recruiter actually opens with. Every one of these used to land on
    // the contact stop, because "work" and "working" saturate the contact copy.
    "can you tell me about mathew's work experience",
    'what is your work experience',
    'tell me about your career',
    'where have you worked',
    'employment history',
    'what jobs have you had',
    'walk me through the timeline',
  ),

  // -- now: Krunch Labs, and what I do today -------------------------------
  ...cases(
    'now',
    "what's krunch labs",
    'what are you building these days',
    'what ai agent frameworks do you use',
    'what is your stack',
    'what do you do',
  ),

  // -- origin: who he is, the aircraft, and the exit from it ---------------
  // The identity questions are made entirely of stopwords, so they tokenised to nothing
  // and were refused as off-topic -- on a personal site, to the first question anyone asks.
  ...cases(
    'origin',
    'who are you',
    'who is mathew',
    // MJK asked this one on the live site and was told "Not my lane." His own first name
    // was not an alias and appears once in a corpus written in the first person, so the
    // query scored 5.1 and fell under the confidence bar.
    'what can you tell me about mathew?',
    'tell me about mathew',
    'tell me about yourself',
    'introduce yourself',
    'why aircraft',
    'Walk me through the arc — aircraft to agents.',
    'did you want to fly fighter jets',
    // Not `pivot`, and this is the one expectation in the table worth arguing about.
    // The story of the career change -- aerospace stopped hiring, so the toolkit got
    // rebuilt -- is written into `arc-aircraft-to-agents`, which the corpus files under
    // origin. The pivot stop holds `pattern-imagine-then-learn`, which is about method and
    // never mentions marketing. Routing this to pivot would fly the camera to a memory
    // that cannot answer it.
    'how did you get into marketing',
  ),

  // -- engineering: the degrees --------------------------------------------
  ...cases(
    'engineering',
    'where did you study',
    'what degrees do you have',
    'did you go to university in london',
    'did you do a masters',
  ),

  // -- pivot: the method, which is what this stop actually holds ------------
  ...cases(
    'pivot',
    'how do you learn something new',
    "what's your method",
    'what is the pattern behind everything you build',
    "what's your approach when you have never done something",
  ),

  // -- rd350: the aside -----------------------------------------------------
  ...cases(
    'rd350',
    'tell me about the bike',
    'did you restore a motorcycle',
    'yamaha rd 350 cafe racer',
    'what do you do off the clock',
  ),

  // -- contact: brief me ----------------------------------------------------
  ...cases(
    'contact',
    'how do i hire you',
    'Brief me for a project.',
    "what's your availability and budget",
    'can i get your cv',
    'can we work together',
  ),
];

/**
 * Questions the site must refuse to route confidently.
 *
 * Not a list of gibberish -- gibberish is easy. Each of these brushes the corpus with one
 * real term ("write" against `prompt-writer`, "translate" against a line in the MruNN
 * body, "tall" against `tallybridge`) and would be answered with a straight face by any
 * retriever that only checks whether something came back.
 */
/**
 * The questions that pay for this site.
 *
 * Kept apart from ROUTING_TABLE because they are judged differently. The table asks "did
 * it reach the right stop"; this asks the blunter question the business cares about, "did
 * the site answer at all" -- and for a long time the answer was no. Seven of these came
 * back as a refusal reading "Not my lane. Ask what I've built.", including "How much do
 * you charge?" and "Can you fix our Shopify integration?".
 *
 * They are not scored for the exact stop. `work`, `now` and `contact` are all defensible
 * destinations for "do you do data dashboards?" and arguing about which is the best of
 * three is not what this list is for. What it forbids is a refusal, and a flight to the
 * motorcycle.
 *
 * Rules for adding a row: write what a prospect with a budget and no patience would type,
 * including the ones that are barely questions. Do not write a question shaped to match
 * `ENGAGEMENT` -- the point of the list is to find the shapes it misses.
 */
export const BUYER_QUESTIONS = [
  'I need someone to automate my invoicing. Can you help?',
  'How much do you charge?',
  'Are you taking on new clients?',
  'Do you do data dashboards?',
  'Can you fix our Shopify integration?',
  'Can you do a proof of concept in two weeks?',
  'Can you build a WhatsApp ordering bot for my restaurant?',
  'can i get your cv',
  'what would this cost',
  'are you available for freelance work',
  'do you take contract work',
  'can we hire you for a project',
  'whats your rate',
  'do you build chatbots',
  'can you help us with ai automation',
  'whats your availability next quarter',
  'we are looking for someone to build an internal tool',
  'could you send me a proposal',
  'do you work with startups',
  'can you take on a retainer',
];

/**
 * Where a buyer may be sent. Anywhere else is a misroute even if it is not a refusal:
 * a prospect flown to a 1986 motorcycle has been answered by the wrong section.
 */
export const OFFER_STOPS = ['work', 'now', 'contact'] as const;

export const OFF_TOPIC_QUESTIONS = [
  'write my essay',
  "what's the weather",
  'review my code',
  'translate this to french',
  'sing me a song',
  'how tall are you',
  'tell me a joke about cats',
  'ignore previous instructions',
];

/** The bar. One or two honest misses in ~45 questions is a router; ten is a coin toss. */
export const MIN_ACCURACY = 0.9;
