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
 * are drawn; these address the ones that are not.
 *
 * That gap used to be enormous on §04 — seventeen of nineteen — and the split closed most
 * of it: the index and the three project stops now draw thirty of the fifty-five, against
 * seventeen before. What is left for these chips is the depth that genuinely has nowhere
 * to go, four of the seven JewelAI memories among it. The chip row is height the page has
 * already paid for — 32.9px at 1440x900, 41px on a phone, on every screen at every scroll
 * position.
 *
 * AUTHORED STRINGS, NOT DERIVED FROM TITLES. A generated chip cannot be checked, and the
 * check is not decorative: below 768px the row is one chip in an `overflow: hidden` grid
 * cell, so a suggestion that wraps clips rather than reflows. `voice.test.ts` holds every one
 * of these to 40 characters for that reason. Several memory titles are already longer than
 * that, which settles the question on its own.
 *
 * Four per stop, matching the count the dock already shows, so `--dock-h` never changes and
 * the twelve stops are never relaid out to swap a suggestion.
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
    // Was "What's your approach to something new?", which is the third way of asking the
    // two above it on a stop that holds two memories. `pivot-how-it-happened` carries the
    // doctorate and nothing was asking for it.
    'What happened at IIT Bombay?',
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
  /*
   * All four replaced, and two of them had to be.
   *
   * "How does JewelAI read a piece?" and "Does the pipeline ever refuse?" are questions
   * about JewelAI, and JewelAI is getting a stop of its own. The moment its seven
   * memories move there, both of these route to that stop instead — correct behaviour,
   * and a broken promise from a chip that sits on this one. They move with the memories.
   *
   * What replaces them addresses the four projects that STAY here and have no section of
   * their own: TallyBridge, the outreach engine, Artha, and the overview that names them
   * all. Each was checked against the retriever with `viewing: 'work'` set, which is what
   * a chip in the dock always sends.
   */
  work: [
    'What have you built?',
    'Tell me about TallyBridge.',
    'What is Artha?',
    'Tell me about the outreach engine.',
  ],
  /*
   * The three project stops. Each set was run through the retriever with `viewing` set to
   * its own stop — which is what the dock sends — and every one routes home, comes back
   * topical, and fits the 40-character line the narrowest phone gives a chip.
   *
   * `topical` is the field the handler branches on, so a chip that came back untopical
   * would be the site offering a question and then refusing it. Two candidates did exactly
   * that and were dropped: "How many images were accepted?" and "Why not just a form?".
   * Both read well and both would have produced "not my lane" from a control the page
   * itself put on the screen.
   */
  /*
   * The four have a LENGTH budget between them as well as one each, and this set was
   * rewritten after a screenshot rather than after a count.
   *
   * `voice.test.ts` holds every suggestion to 40 characters, which is the wrap point of a
   * single chip in the one-at-a-time row a 320px phone gets. Above 768px the row is a flex
   * that holds all four, and the first version of this set — 137 characters across the four
   * — wrapped to a second line at 1440x900. That republishes `--dock-h`, 143px to 168px,
   * and every one of the twelve sections derives its bottom padding from it: twelve
   * relayouts, on arriving at one stop. Measured; `asanjo` was the only stop in the file
   * doing it. 92 characters now, against 94 on `work` and 110 on `jewelai`.
   */
  asanjo: [
    'Who is Asanjo?',
    'What does a supplier photo become?',
    'What is the pass mark?',
    'What is in the ledger?',
  ],
  jewelai: [
    'How does it read a piece?',
    'Does the pipeline ever refuse?',
    'What does JewelAI Studio run on?',
    'Tell me about the ring.',
  ],
  mrunn: [
    'What is MruNN-ERP?',
    'Does anything change without approval?',
    'Is it GST compliant?',
    'Why build an ERP you talk to?',
  ],
  contact: [
    'What do you take on?',
    'How does an engagement start?',
    'Are you taking on new clients?',
    'What would this cost?',
  ],
};
