import type { StopId } from './stops';

/**
 * Copy that is not a stop and not a memory.
 *
 * Until this commit this file also held a `hero` object and a `capabilities` list, both
 * read only by `components/sections/*`, which no longer exists. `hero.tagline` was a
 * second copy of the hero title and `hero.sub` a third variant of the hero body — three
 * near-identical sentences in two files, which is the drift that put two fabrications on
 * the live site and kept them there for months. The hero's copy has one home now:
 * `content/stops.ts`.
 *
 * What is left is the four prompts the dock offers before anyone has asked anything.
 * They are questions, not claims, and `evals/tier-a/claims.test.ts` scans them anyway.
 */
export const suggestedPrompts = [
  'The arc: aircraft to agents.',
  'Show me the AI work.',
  'What’s the paid-media track record?',
  'Brief me for a project.',
];

/**
 * What each section provokes, authored per stop.
 *
 * The dock offered the same four questions on all nine stops, on a site whose whole
 * architecture is that a question belongs to a section. The cards address the memories that
 * are drawn; these address the ones that are not, and on §07 that is seventeen of nineteen —
 * the outreach engine, Artha, the awards, the numbers, and four of the seven JewelAI
 * memories. There is nowhere to draw them: §07's media column has 35.2px of slack at
 * 1440x900 and −74.5px at 1280x720, into an `overflow: hidden` that destroys. The chip row is
 * height the page has already paid for — 32.9px at 1440x900, 41px on a phone, on every screen
 * at every scroll position.
 *
 * AUTHORED STRINGS, NOT DERIVED FROM TITLES. A generated chip cannot be checked, and the
 * check is not decorative: below 768px the row is one chip in an `overflow: hidden` grid
 * cell, so a suggestion that wraps clips rather than reflows. `voice.test.ts` holds every one
 * of these to 40 characters for that reason. Several memory titles are already longer than
 * that, which settles the question on its own.
 *
 * Four per stop, matching the count the dock already shows, so `--dock-h` never changes and
 * the nine stops are never relaid out to swap a suggestion.
 *
 * `hero` is absent deliberately: it has no memories of its own and it is where a visitor
 * arrives, so it keeps the four that introduce the whole site.
 */
export const stopPrompts: Partial<Record<StopId, readonly string[]>> = {
  origin: [
    'Why aircraft?',
    'Did you want to fly fighter jets?',
    'What were you competing in?',
    'Walk me through the arc.',
  ],
  engineering: [
    'Where did you study?',
    'What was the MJK-101?',
    'What stuck from engineering?',
    'What did you do as a trainee?',
  ],
  pivot: [
    'How did the pivot to media happen?',
    'What is the pattern?',
    'How do you learn something new?',
    "What's your approach to something new?",
  ],
  apac: [
    'What actually shipped at Taboola?',
    'What did you do at Omnicom?',
    'Tell me about the Canon work.',
    'The career, in order?',
  ],
  rd350: [
    'How did you build the RD 350?',
    'Why a motorcycle?',
    'What did the rebuild involve?',
    'What do you do off the clock?',
  ],
  now: [
    'What do you do now?',
    'What is Krunch Labs?',
    'How do you direct an agent?',
    'Can you do full-stack work?',
  ],
  work: [
    'How does JewelAI read a piece?',
    'Does the pipeline ever refuse?',
    'Tell me about the outreach engine.',
    'What is Artha?',
  ],
  contact: [
    'What do you take on?',
    'How does an engagement start?',
    'Are you taking on new clients?',
    'What would this cost?',
  ],
};
