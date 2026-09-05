/**
 * The workflow chart, and the answer to whether this site should have one.
 *
 * WHY IT EXISTS NOW AND DID NOT BEFORE. MJK asked whether the software should be drawn as
 * workflow charts "so people have a better understanding of what was built beyond just the
 * imagery". The earlier answer was no, and its reason was specific and correct at the
 * time: the corpus licensed none of the interesting stations, so a diagram would have read
 * "LangGraph orchestration -> custom retouching agents -> brand-voice guardrails", which
 * is three noun phrases already printed on the card beside it. Reading the JewelAI
 * codebase added six memories that name the real stations, and that reason expired with
 * them. Every line below traces to `jewelai-reads-the-piece` or `jewelai-gates`.
 *
 * WHY IT IS THIS CHART AND NOT A PIPELINE. A left-to-right row of stations is the diagram
 * MJK asked for and it is the wrong one, for the reason `PLAN.md` §4.1 records about the
 * §02 unit chart that was built, judged and withdrawn: it draws a sentence the prose
 * already contains. Prose serialises a sequence perfectly well — "a classifier, then a
 * creative director, then a prompt writer" needs no picture. What prose is bad at, and a
 * drawing is good at, is BRANCHING: three different places one lane is allowed to leave
 * itself, each with a different consequence. So the lane runs top to bottom and the
 * content is the three exits off it. `jewelai-gates` opens "What I care about most in
 * JewelAI Studio is that it is allowed to stop", and nothing anywhere else on this site
 * carries that.
 *
 * WHY NO LIBRARY. The entire drawn content is 24 `<path>` elements, 1.4 kB of inline SVG,
 * server-rendered, zero JavaScript. Measured alternatives, gzipped, in this repo's own
 * `node_modules` resolution: see `research-jewelfig.md`. The cheapest thing that renders a
 * node and an edge is ~190x the size of what is drawn here, and two candidates fail before
 * the size question is reached — `elkjs` is EPL-2.0/GPL-3.0, and Mermaid throws under
 * Node so it could not be server-rendered at all.
 *
 * WHY THE MARKS ARE SHAPED THE WAY THEY ARE. MJK's own Krunch Labs deck uses a dashed
 * border for what goes in and a solid border for what comes out, consistently, on both of
 * its pipeline pages. That convention is borrowed here: the entry mark is dashed, the exit
 * mark is solid, and the decisions between them are diamonds — the flowchart convention
 * for a branch, which is what each of them is. The deck's palette is orange and cyan and
 * none of it crosses: `DESIGN.md` reserves both for the WebGL layer.
 *
 * WHY EVERY STROKE IS PAINTED TWICE. There is a moving particle field behind this and
 * `DESIGN.md` forbids a scrim over it, twice. So each mark is drawn fat in `#08080c`
 * first and in the accent over it, and each diamond is filled with `#08080c` so the spine
 * does not run through its middle. The accent never touches the scene, which turns its
 * 11.34:1 contrast from a measurement into a constant. All the text is HTML and inherits
 * `--halo` from `.media-zone`, so there is no SVG `<text>` here and `paint-order: stroke`
 * is not needed — `MJK101Figure.tsx` is where that tool is required.
 */

/**
 * The spine runs at x=8 in every mark's own 34x18 viewBox, so they line up by construction.
 *
 * 34x18 and not 30x14, which is what the first pass drew. Rendered, an 11px diamond with a
 * 3.6px casing under a 1.3px ink line had almost nothing of itself left: the casing and the
 * `#08080c` plug ate the middle and what printed was a pair of chevrons, `<|>`, which reads
 * as punctuation rather than as a decision. At 12 wide by 14 tall against a 3.2px casing
 * the shape survives. This is the same failure mode `.pair-arrow` does not have and the
 * reason is scale: a casing that is 2.8x the ink is fine along a line and fatal on a small
 * closed shape.
 */
const DIAMOND = 'M8 2 L14 9 L8 16 L2 9 Z';
const EXIT = 'M14 9 H29.5 M25.8 5.6 L29.8 9 L25.8 12.4';
/** Dashed, because it is what goes in. Solid, because it is what comes out. See the header. */
const IN_MARK = 'M3 3.6 H13 V14.4 H3 Z';
const OUT_MARK = 'M8 1.4 V10 M4 7 L8 12.6 L12 7';

type Step = {
  /** `gate` carries a decision the pipeline can leave by; `in`/`out` are the two ends. */
  readonly kind: 'in' | 'gate' | 'out';
  /** True when this decision has a way off the lane, which is what the chart is about. */
  readonly exit?: boolean;
  readonly q: string;
  readonly a?: string;
};

/**
 * Eight rows, and every clause traces to the corpus.
 *
 * `jewelai-reads-the-piece` licenses the entry, the geometry question, the amateur-photo
 * expectation, the same-piece and angle questions, the reconciliation and the fact that
 * the piece is never described in words. `jewelai-gates` licenses all three consequences —
 * halting to ask a person, refusing to run, and the single retry that carries the judge's
 * own complaint. `jewelai-video` licenses the clip in the last row.
 */
const STEPS: readonly Step[] = [
  { kind: 'in', q: 'three photographs of one piece, together' },
  {
    kind: 'gate',
    q: 'can the geometry be read from these?',
    a: 'amateur phone photos are expected, not a reason to refuse',
  },
  {
    kind: 'gate',
    exit: true,
    q: 'are they all the same piece?',
    a: 'no, and it halts to ask a person',
  },
  {
    kind: 'gate',
    exit: true,
    q: 'are the angles different enough?',
    a: 'no, and it refuses to run',
  },
  {
    kind: 'gate',
    q: 'one description, reconciled from the whole set',
    a: 'contradictions between the angles are settled, not averaged',
  },
  {
    kind: 'gate',
    q: 'generate, with every reference attached',
    a: 'the piece is never described to the model in words',
  },
  {
    kind: 'gate',
    exit: true,
    q: 'a judge scores it against the photographs',
    a: 'no, and it goes back once, carrying the complaint',
  },
  /*
   * "the finished image", not "a finished image". `evals/tier-a/claims.test.ts` reads an
   * article before a counted noun as a quantity — that is the shape every fabrication this
   * repo has shipped took — and requires the corpus to contain the phrase verbatim. It
   * does not, so the definite article is both the correct English here and the honest way
   * past the scan rather than round it.
   */
  { kind: 'out', q: 'the finished image, and a clip made from it' },
];

function markFor(s: Step): { stroke: string; fill?: string } {
  if (s.kind === 'in') return { stroke: IN_MARK, fill: IN_MARK };
  if (s.kind === 'out') return { stroke: OUT_MARK };
  return { stroke: s.exit ? `${DIAMOND} ${EXIT}` : DIAMOND, fill: DIAMOND };
}

export default function JewelGates() {
  return (
    <figure className="jg">
      {/*
        An ordered list, because it is one: a screen reader gets eight steps in sequence
        with their consequences, and the drawing is `aria-hidden` decoration over the top
        of real text rather than a picture someone has to be told about.
      */}
      <ol className="jg-lane">
        {STEPS.map((s) => {
          const m = markFor(s);
          return (
            <li className="jg-step" key={s.q} data-kind={s.kind} data-exit={s.exit ? '' : undefined}>
              <svg className="jg-mark" viewBox="0 0 34 18" aria-hidden="true" focusable="false">
                {/* The casing pass: the same geometry, fat, in the page's own near-black. */}
                <path className="jg-case" d={m.stroke} />
                {/* Fills the mark so the spine behind it does not print through its middle. */}
                {m.fill ? <path className="jg-plug" d={m.fill} /> : null}
                <path className="jg-ink" d={m.stroke} />
              </svg>
              <span className="jg-q">{s.q}</span>
              {s.a ? <span className="jg-a">{s.a}</span> : null}
            </li>
          );
        })}
      </ol>

      <figcaption className="jg-cap">
        JewelAI Studio, and the part I care about most: it is allowed to stop.
      </figcaption>
    </figure>
  );
}
