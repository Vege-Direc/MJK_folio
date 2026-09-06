import type { ComposeKind, StopId } from '@/content/stops';
import type { Memory, Section } from '@/lib/corpus/schema';

/**
 * What the page draws without being asked, as data both the renderer and the gate read.
 *
 * `scripts/check-corpus.ts` enforces the site's own rule -- anything a question can reveal
 * must ALSO be reachable without asking -- by counting which memories reach the server HTML
 * of `/`. It cannot render the tree to find out (`AuthoredBody` throws outside
 * `<ChatProvider>`, and reading `.next/server/app/index.html` would be reading the previous
 * build), so it MODELS what `StopSection` draws.
 *
 * That model used to be a copy of the component's constants plus four regexes over the
 * component's own source, checking the copy had not gone stale. The check's own comment
 * named the better answer: "export the card rule from a module both files import, so there
 * is nothing left to drift." This is that module. The numbers below are the numbers the
 * page uses and the numbers the gate counts, and there is now exactly one of each.
 */

/** Cards are drawn from the corpus, so a card can never claim what a memory does not. */
export const CARD_SECTIONS = new Set<Section>(['projects', 'capabilities', 'timeline']);

/**
 * A `cards` stop: one viewport tall, one column, so four is what fits. `apac` and `now`
 * carry far more than four and showing all of them would push a 100svh panel into
 * `overflow: hidden`, which above 900px destroys the excess rather than scrolling it.
 */
export const MAX_CARDS = 4;

/**
 * A stop whose media column is ONE FIGURE over a short list: `proof` (JewelAI's evidence)
 * and `pair` (the supplier/catalogue frames). Two, and it is arithmetic rather than taste.
 * Measured at 1440x900: the band is ~623px, the pair figure and its caption spend ~353 of
 * it and `--pair-h` reserves the rest for exactly two cards. A third costs ~116px and there
 * are ~60 spare, so the third card would not scroll -- it would be destroyed, along with
 * part of the second.
 */
export const PROOF_CARDS = 2;

/**
 * The index has NO figure, so its whole column is the tile grid: a row of three chapter
 * tiles over a two-column card grid. Six is measured, and the first number tried was seven
 * -- every card-eligible memory `work` owns.
 *
 * Seven came to 691px. Screenshotted at 1280x720 the media column has about 577px, and
 * `.panel` is `overflow: hidden` above 900px, so the excess is not scrolled, it is
 * destroyed: the three chapter tiles lost their hairlines and their eyebrows off the top
 * of the column and the last card was cut in half under the dock. Six is 3 rows instead
 * of 4.
 *
 * THE SEVENTH IS `build-overview`, AND IT IS THE RIGHT ONE TO LOSE. Its first sentence is
 * "The things I have shipped, rather than the jobs I have held" -- which is, word for word,
 * the first sentence of §04's own authored paragraph, printed 500px to the left of it. The
 * card was not carrying a fact the page was missing; it was printing the section's own
 * opening line back at the reader. Corpus order puts it last on this stop, so the cut
 * lands there by itself, and moving a memory up in `content/memories.yaml` is how an
 * author changes which six these are.
 *
 * Its prose is still in the HTML of `/`, in the body of this stop. What it is not, any
 * more, is under its own memory id -- which is what `check-corpus`'s rule-24 count reads,
 * so the count is 29 rather than 30 and the floor says so.
 */
export const INDEX_CARDS = 6;

/**
 * The three projects that have a stop of their own, and the memory whose title and first
 * sentence names each on the index.
 *
 * This is an authored choice and it is deliberately not "the first memory on that stop":
 * the tile is the one place a project is introduced by name, so it draws the summary, and
 * the stop's own cards then draw the depth instead of repeating it one screen later. That
 * is also why `project-jewel-ai` was moved to the end of the JewelAI block in
 * `content/memories.yaml` -- the index says what JewelAI Studio is, and §06's two cards say
 * what it runs on and how it reads a piece.
 */
export const WORK_CHAPTERS: readonly { readonly stopId: StopId; readonly memoryId: string }[] = [
  { stopId: 'asanjo', memoryId: 'asanjo-engagement' },
  { stopId: 'jewelai', memoryId: 'project-jewel-ai' },
  { stopId: 'mrunn', memoryId: 'project-mrunn-erp' },
];

/**
 * How many cards a stop of this kind draws. Zero means it draws none -- `hero`, `plain`,
 * `carousel` and `figure` are authored copy and pictures, with no memory prose in them.
 *
 * `contact` is not here on purpose: it draws EVERY memory it has, unfiltered by section,
 * because its two are the only ones that would ever be filtered out and the stop exists to
 * be acted on rather than browsed.
 */
export function cardLimitFor(compose: ComposeKind): number {
  switch (compose) {
    case 'cards':
      return MAX_CARDS;
    case 'proof':
    case 'pair':
      return PROOF_CARDS;
    case 'index':
      return INDEX_CARDS;
    default:
      return 0;
  }
}

/** The memories a stop of this kind draws as cards, in corpus order. */
export function cardsFrom(compose: ComposeKind, memories: readonly Memory[]): Memory[] {
  return memories.filter((m) => CARD_SECTIONS.has(m.section)).slice(0, cardLimitFor(compose));
}

/**
 * How much of a card's description fits in the two lines the layout gives it.
 *
 * Two lines at the NARROWEST column a card ever gets, which is 351px on a 390px phone.
 * Measured on the built page rather than derived: 14px at 1.55 line-height in that column
 * takes about 44 characters a line, so 88 is the honest budget and anything past it was
 * being thrown away by CSS.
 */
export const CARD_CHARS = 88;

/**
 * The first sentence of a memory body, cut to fit the card.
 *
 * Bodies are YAML folded scalars, so they arrive as one long line with the newlines
 * already collapsed. Splitting on a full stop followed by a space is enough, and falling
 * back to the whole body means a one-sentence memory renders whole rather than empty.
 *
 * THE SECOND CUT, AND WHY IT IS HERE RATHER THAN IN CSS. `.mini-card .mb` also carries
 * `-webkit-line-clamp: 2`, so a first sentence longer than two lines was truncated twice —
 * and the second truncation knows nothing about words. A judge panel found three cards
 * reading "…renders traditional forms when they ar…" and "…an AI assistant in front of it
 * — 27 MCP…", each with `scrollHeight` 65 against `clientHeight` 43 and free space under
 * the card.
 *
 * Raising the clamp to three lines was measured and rejected: it clears every desktop cut
 * but costs the work stop 43px, which fits at 1440 and 1920 and overflows a 1280x720 band
 * that has 15px of slack — a defect traded for a defect. And it still leaves three of six
 * cut on a phone, where the column is narrowest. Cutting on a word boundary here costs 0px
 * at every viewport and is the only version that fixes the phone too.
 *
 * The ellipsis is deliberate and the clamp stays. A visible cut is a promise that there is
 * more, and the card's id is the memory's id, so the whole thing is one question away in
 * the chat. The clamp remains as the backstop for a column narrower than any measured here.
 */
export function firstSentence(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  const end = text.search(/[.!?](\s|$)/);
  const sentence = end === -1 ? text : text.slice(0, end + 1);
  if (sentence.length <= CARD_CHARS) return sentence;
  // Back up to the last space inside the budget, so the cut lands between words. The
  // fallback is the hard slice, for the pathological case of a single 88-character word.
  const cut = sentence.lastIndexOf(' ', CARD_CHARS);
  const kept = sentence.slice(0, cut > 0 ? cut : CARD_CHARS);
  // A word boundary is not always a good place to stop: "...syncs Indian accounting
  // software into a" is grammatically mid-thought and reads as a bug rather than as a
  // trim. Dropping a dangling function word and any punctuation that led into it costs
  // nothing and leaves the cut on a noun.
  // The group repeats, because "software into a" needs both words dropped, not one.
  return `${kept.replace(/(?:[\s,;:—-]+(?:a|an|the|of|to|in|into|on|for|and|or|with|that|its|their))+$/i, '').replace(/[,;:—-]$/, '')}…`;
}
