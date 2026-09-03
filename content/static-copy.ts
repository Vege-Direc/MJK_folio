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
