/**
 * §02's figure: the Brunel Airbus project, drawn as a count.
 *
 * WHY A UNIT CHART AND NOT A DRAWING. The corpus holds three facts about this aircraft —
 * 100, 28, London City — and no geometry whatsoever. No span, no chord, no MTOW, no
 * frame. A general arrangement or a dimensioned blueprint would therefore be invention
 * dressed as engineering, on a site whose entire premise is that every claim traces to
 * something authored. A unit chart has no such exposure: the count IS the drawing, so
 * there is nothing left to make up. The fuselage outline an earlier prototype drew around
 * these marks was the one invented element in it, and dropping it is what makes the
 * figure both honest and small enough to fit a phone.
 *
 * WHY IT SURVIVES THE SCENE. Thin strokes at low alpha were built and put over the live
 * page, and they lose: the scene is bright thin lines on black and so is a schematic, so
 * the two read as the same material and the diagram dissolves. Density does not have that
 * problem — the eye reads a field of marks as one object however busy the ground is.
 * Every mark is then cased: `paint-order: stroke` paints a dark stroke first and the fill
 * over it, so each mark carries a ~1.5px dark surround. That is the page's halo rule
 * extended from glyphs to geometry, and unlike a blur it costs nothing to raster.
 *
 * WHY IT IS TWO SVGS AND NOT ONE. The labels have to be HTML — mono type inside a
 * scaling SVG scales with it, and this page has an 11px floor that a `transform` would
 * quietly violate. Splitting the blocks lets the labels sit between them. The two then
 * have to agree about pitch, which is what the width percentage below is for.
 *
 * There is no animation. Measured at 375x812 under 4x CPU throttle with a figure injected
 * into all nine stops: static SVG costs 24.9ms at p95 against a 24.6ms baseline, which is
 * inside run-to-run noise, while a looping `stroke-dashoffset` costs 25.5ms with the
 * worst frame going 66ms to 92ms and framerate down 11%. Static is free. Moving is not.
 */

/** 15 units between marks, 9 units of mark. Both blocks, or the comparison is a lie. */
const PITCH = 15;
const MARK = 9;

/** 20 x 5 and 14 x 2. Chosen so both blocks share a left edge and neither wraps at 375. */
const FULL = { count: 100, cols: 20 };
const BUSINESS = { count: 28, cols: 14 };

function marks(count: number, cols: number) {
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    x: (i % cols) * PITCH,
    y: Math.floor(i / cols) * PITCH,
  }));
}

/**
 * `-3` on the viewBox origin and `+6` on its size are the casing's bleed. Without them
 * the stroke on the outermost marks is clipped by the viewport edge and the block looks
 * cropped on two sides.
 */
function Block({ count, cols }: { count: number; cols: number }) {
  const rows = Math.ceil(count / cols);
  const w = (cols - 1) * PITCH + MARK;
  const h = (rows - 1) * PITCH + MARK;
  return (
    <svg
      className="fig-marks"
      viewBox={`-3 -3 ${w + 6} ${h + 6}`}
      // The counts are in the caption beside them, in words. Reading the marks out one
      // by one would be a hundred announcements of nothing.
      aria-hidden="true"
      focusable="false"
    >
      {marks(count, cols).map((m) => (
        <rect key={m.key} x={m.x} y={m.y} width={MARK} height={MARK} rx={1.5} />
      ))}
    </svg>
  );
}

export default function CabinFigure() {
  return (
    <figure className="fig-cabin" aria-label="The Brunel Airbus design project, by the numbers">
      <figcaption className="fig-kicker">Brunel · Airbus design project</figcaption>

      <div className="fig-block">
        <Block count={FULL.count} cols={FULL.cols} />
        <p className="fig-label">
          <span className="fig-n">100</span> passengers, short European routes
        </p>
      </div>

      {/*
        The second block is 204 units wide against the first's 294, and both are drawn at
        the same pitch. That only holds if the rendered widths keep the same ratio, so the
        percentage below is 210/300 — the two viewBox widths, casing included. Change one
        and this number changes with it, or the figure starts comparing marks of two
        different sizes and says something untrue.
      */}
      <div className="fig-block fig-block-narrow">
        <Block count={BUSINESS.count} cols={BUSINESS.cols} />
        <p className="fig-label">
          <span className="fig-n">28</span> in business class, across continents
        </p>
      </div>

      <p className="fig-foot">One aircraft, two roles · out of London City</p>

      {/*
        Every number in this figure is licensed by one memory, `engineering-what-stuck`,
        which reads "a dual-role airliner: 100 passengers on short European routes or 28
        in business class across continents, operating out of London City". If that
        sentence is ever edited, this figure is edited with it. It is not read from the
        corpus at runtime because the corpus loader is server-side and asynchronous, and
        a figure that renders a different shape depending on a file read is a figure that
        can silently disagree with the words beside it.
      */}
      <p className="sr-only">
        A hundred marks and twenty-eight marks, drawn at the same size, from the Airbus
        design project during the aerospace masters at Brunel, 2011 to 2012.
      </p>
    </figure>
  );
}
