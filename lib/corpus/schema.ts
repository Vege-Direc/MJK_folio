/**
 * The shape of a memory, and of the corpus as a whole.
 *
 * `content/memories.yaml` is the highest-churn, human-authored file in this project and
 * the source of truth for every factual claim the site makes. Everything it has ever got
 * wrong was typed by a person into an unvalidated file. This schema is where that stops.
 *
 * One importer today: `scripts/check-corpus.ts`, the gate that `prebuild`, CI and the
 * authoring hook all run. Nothing loads the corpus through this schema at runtime --
 * `lib/rag.ts` parses the YAML raw -- so the rules below are build-time rules and nothing
 * more. That is said plainly rather than flattered, because a rule only the build enforces
 * is a rule production can still violate.
 *
 * The structural rules live here, apart from the checker, because they are the ones a
 * runtime loader will eventually want. Rules needing the filesystem or the whole corpus in
 * view (does the gallery exist? is this stop thin?) live in the script.
 *
 * Every message below is written for someone who has never read this file. The error text
 * IS the documentation for the corpus format -- there is no other document, on purpose.
 */
import { z } from 'zod';
import { ANSWERABLE_STOP_IDS, STOP_IDS, type StopId } from '../../content/stops';

/* -- vocabularies ---------------------------------------------------------- */

/** Sections group memories for rendering. A memory in no known section renders nowhere. */
const SECTIONS = ['story', 'timeline', 'projects', 'capabilities', 'contact'] as const;
export type Section = (typeof SECTIONS)[number];

/** The keys a memory may carry. Anything else is a typo -- see `unknownFieldsIn`. */
const MEMORY_FIELDS = [
  'id',
  'section',
  'stopId',
  'title',
  'body',
  'tags',
  'period',
  'media',
  'aliases',
  'facts',
] as const;

const STOP_LIST = STOP_IDS.join(', ');
const ANSWERABLE_LIST = ANSWERABLE_STOP_IDS.join(', ');
const SECTION_LIST = SECTIONS.join(', ');

/** Resume periods are history. A year outside this window is a typo, not a date. */
const EARLIEST_YEAR = 1950;
const LATEST_YEAR = new Date().getFullYear() + 1;

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PERIOD = /^(\d{4})(?:-(\d{4}|present))?$/;
const GALLERY = /^gallery:([a-z0-9]+(?:-[a-z0-9]+)*)$/;
/** en-dash, em-dash and friends: identical to a reader, invisible to a parser. */
const TYPOGRAPHIC_DASH = /[‐-―−]/g;

/* -- leaf schemas ---------------------------------------------------------- */

const idSchema = z
  .string()
  .trim()
  .min(1, '`id` is required. It is the stable handle for this memory.')
  .regex(
    KEBAB,
    '`id` must be kebab-case: lowercase letters and digits joined by single hyphens, e.g. "project-taboola". ' +
      'Ids are stable handles -- retrieval cites them and the WebGL layer targets pulses by id -- so renaming ' +
      'one is a breaking change, not a tidy-up.',
  );

const sectionSchema = z.enum(SECTIONS, {
  error: () =>
    `\`section\` must be one of: ${SECTION_LIST}. ` +
    'A memory with an unrecognised section still parses and is still retrieved, but no part of the page knows ' +
    'how to render it -- it disappears silently instead of failing.',
});

/**
 * CHECK H. Until 2026-08-27 not one memory in this corpus carried a `stopId`, so the
 * deterministic router -- the thing the entire chat architecture rests on -- had nothing
 * to route with. This is the rule that makes that state unshippable.
 */
const stopIdSchema = z.enum(STOP_IDS as unknown as readonly [StopId, ...StopId[]], {
  error: () =>
    `\`stopId\` must name one of the nine stops declared in content/stops.ts: ${STOP_LIST}. ` +
    'The router maps a question to a stopId and the renderer maps that stopId to a layout, so a memory without ' +
    'a valid one can be retrieved but never placed -- it can never reach the screen. Add the stop this memory ' +
    'belongs to; do not invent an id here, add it to content/stops.ts first.',
});

const titleSchema = z
  .string()
  .trim()
  .min(
    1,
    '`title` must not be empty. The title is what retrieval scores against and what a citation shows, so an ' +
      'untitled memory is both harder to find and unattributable when it is found.',
  );

const bodySchema = z
  .string()
  .trim()
  .min(
    1,
    '`body` must not be empty. The body is the only prose retrieval hands the model. An empty one means the ' +
      'model answers this stop from nothing at all, which is precisely how a fabrication starts.',
  );

const tagsSchema = z
  .array(z.string().trim().min(1, '`tags` must not contain an empty tag. Delete the blank entry.'))
  .min(
    1,
    '`tags` needs at least one tag. Retrieval scores title + tags + body, so an untagged memory is reachable ' +
      'only by words that happen to appear in its prose -- it will lose to memories that were tagged.',
  );

/**
 * `period: 2015` is what an author actually types for a single year, and YAML hands that
 * over as an integer, not a string. Normalising it here is not laxity -- it is the
 * difference between the single-year form working and the author getting "Expected
 * string, received number", which documents nothing and describes a mistake they did not
 * make. Anything that is not a whole number falls through to the message below.
 */
const periodSchema = z.preprocess(
  (value) => (typeof value === 'number' && Number.isInteger(value) ? String(value) : value),
  z
    .string({
      // zod 4 folded `invalid_type_error` and `required_error` into a single `error` map.
      // Returning undefined for every other code defers to the messages raised below.
      error: (issue) =>
        issue.code === 'invalid_type'
          ? '`period` must be a year or a range of years, written as text: "2019", "2017-2019" or ' +
            '"2025-present". A fractional or non-numeric value is not a period. If YAML is reading your ' +
            'value as something else, quote it.'
          : undefined,
    })
    .trim()
    .superRefine((value, ctx) => {
      const fail = (message: string) => ctx.addIssue({ code: 'custom', message });

      if (TYPOGRAPHIC_DASH.test(value)) {
        TYPOGRAPHIC_DASH.lastIndex = 0;
        fail(
          `\`period: "${value}"\` uses a typographic dash. Use a plain ASCII hyphen: ` +
            `"${value.replace(TYPOGRAPHIC_DASH, '-')}". An en-dash reads identically to a human and matches ` +
            'nothing at all to a parser.',
        );
        return;
      }

      const m = PERIOD.exec(value);
      if (!m) {
        fail(
          `\`period: "${value}"\` is not a period this project understands. Write one of: "2019" (a single year), ` +
            '"2017-2019" (a closed range), or "2025-present" (still going). Nothing else -- no months, no quarters, ' +
            'no prose. The period is a date field the site reasons about, not a caption.',
        );
        return;
      }

      const start = Number(m[1]);
      const end = m[2] === 'present' ? LATEST_YEAR : m[2] ? Number(m[2]) : start;

      if (start < EARLIEST_YEAR || start > LATEST_YEAR) {
        fail(
          `\`period: "${value}"\` starts in ${start}, outside the plausible window ` +
            `${EARLIEST_YEAR}-${LATEST_YEAR}. This is a resume: periods are history, not forecasts. A wrong year ` +
            'here is the defect class this site has shipped more often than any other.',
        );
        return;
      }

      if (m[2] && m[2] !== 'present' && (end < EARLIEST_YEAR || end > LATEST_YEAR)) {
        fail(
          `\`period: "${value}"\` ends in ${end}, outside the plausible window ${EARLIEST_YEAR}-${LATEST_YEAR}. ` +
            `If this is still going, write "${start}-present" rather than guessing an end year.`,
        );
        return;
      }

      if (m[2] && m[2] !== 'present' && start > end) {
        fail(
          `\`period: "${value}"\` runs backwards -- it starts in ${start} and ends in ${end}. Put the earlier ` +
            `year first. If this was a single year, write just "${end}".`,
        );
      }
    }),
);

const mediaSchema = z
  .string()
  .trim()
  .regex(
    GALLERY,
    '`media` must be written as "gallery:<slug>" with a kebab-case slug, e.g. "gallery:rd350". The slug is a ' +
      'directory name, not a label: "gallery:rd350" resolves to public/media/rd350/, and check-corpus.ts fails ' +
      'the build when that directory is not there.',
  );

const aliasesSchema = z
  .array(z.string().trim().min(1, '`aliases` must not contain an empty alias. Delete the blank entry.'))
  .min(1, '`aliases` is present but empty. Either list at least one alias or remove the key entirely.');

/* -- facts ----------------------------------------------------------------- */

/**
 * Authored facts. Optional today; the grounding guard will require them.
 *
 * The design point: `numbers` and `entities` are WRITTEN BY THE AUTHOR, never scraped out
 * of `text` by a regex. Every fabrication this site has shipped was a number -- 5x
 * awareness, 2x spend, five APAC markets, not a single advertiser account -- and a scraper
 * that reads numbers back out of the prose can only ever confirm that the prose says what
 * the prose says. Declaring the number separately is a second, independent assertion by a
 * human, and a guard can hold the prose against it.
 *
 * So a number here is never a string. It is a value, the unit it counts, and the kind of
 * quantity it is, because "5" on its own licenses nothing.
 */
const FACT_NUMBER_KINDS = ['count', 'multiple', 'percent', 'currency', 'duration', 'year', 'rank'] as const;

const factNumberSchema = z.object({
  value: z.number({
    error: (issue) =>
      issue.code === 'invalid_type'
        ? '`facts[].numbers[].value` must be a bare number (5, 0.5, 25000000) -- not a string, and not ' +
          '"25 million". The unit belongs in `unit`. A number stored as prose cannot be compared against ' +
          'anything.'
        : undefined,
  }),
  unit: z
    .string()
    .trim()
    .min(
      1,
      '`facts[].numbers[].unit` is required -- "markets", "ROAS", "concurrent viewers", "%". A number with no ' +
        'unit licenses no claim, because nothing can check what it counted.',
    ),
  kind: z.enum(FACT_NUMBER_KINDS, {
    error: () => `\`facts[].numbers[].kind\` must be one of: ${FACT_NUMBER_KINDS.join(', ')}.`,
  }),
});

const factSchema = z.object({
  text: z
    .string()
    .trim()
    .min(
      1,
      '`facts[].text` is required: one self-contained sentence stating the fact, in the first person, exactly as ' +
        'it may be repeated on the site. If it cannot stand on its own it is not a fact, it is a fragment.',
    ),
  /** Authored, never scraped. Empty means "this fact makes no quantified claim". */
  numbers: z.array(factNumberSchema).default([]),
  /** Authored, never scraped. The named things -- clients, employers, products, places. */
  entities: z
    .array(
      z.string().trim().min(1, '`facts[].entities[]` must not contain an empty entity. Delete the blank entry.'),
    )
    .default([]),
});

/* -- the memory ------------------------------------------------------------ */

export const memorySchema = z
  .object({
    id: idSchema,
    section: sectionSchema,
    stopId: stopIdSchema,
    title: titleSchema,
    body: bodySchema,
    tags: tagsSchema,
    period: periodSchema.optional(),
    media: mediaSchema.optional(),
    aliases: aliasesSchema.optional(),
    facts: z.array(factSchema).optional(),
  })
  .superRefine((memory, ctx) => {
    // hero is authored-only. It is the one piece of copy nobody reads on the way past,
    // so a memory that can be routed there is a memory that can quietly overwrite it.
    if (memory.stopId === 'hero') {
      ctx.addIssue({
        code: 'custom',
        path: ['stopId'],
        message:
          '`stopId: hero` is not allowed. The hero is authored copy -- written once, reviewed once, and never ' +
          'read again by anyone scrolling past -- so nothing generated may target it. Route this memory to an ' +
          `answerable stop instead: ${ANSWERABLE_LIST}.`,
      });
    }
  });

/* -- types ----------------------------------------------------------------- */

export type Memory = z.infer<typeof memorySchema>;

/* -- helpers the checker shares -------------------------------------------- */

/** The parsed halves of a well-formed `period`. `present` resolves to the current year. */
export function parsePeriod(period: string): { start: number; end: number; open: boolean } | null {
  const m = PERIOD.exec(period.trim());
  if (!m) return null;
  const start = Number(m[1]);
  if (m[2] === 'present') return { start, end: new Date().getFullYear(), open: true };
  return { start, end: m[2] ? Number(m[2]) : start, open: false };
}

/** The directory slug a `media` value points at, or null if it is not a gallery reference. */
export function gallerySlug(media: string): string | null {
  return GALLERY.exec(media.trim())?.[1] ?? null;
}

/**
 * Keys a memory carries that this schema does not know about.
 *
 * zod strips unknown keys silently, which is exactly the wrong behaviour for a hand-edited
 * file: `stopid:` instead of `stopId:` parses cleanly, contributes nothing, and leaves the
 * memory unroutable without a word of complaint anywhere. The checker reports these as
 * errors and names the field the author probably meant.
 */
export function unknownFieldsIn(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return [];
  const known = new Set<string>(MEMORY_FIELDS);
  return Object.keys(raw).filter((key) => !known.has(key));
}

/** The known field an unknown one was most likely meant to be, if any is close enough. */
export function nearestField(unknown: string): string | null {
  const lower = unknown.toLowerCase().replace(/[^a-z]/g, '');
  return MEMORY_FIELDS.find((field) => field.toLowerCase() === lower) ?? null;
}
