'use client';

import { useEffect, useRef } from 'react';
import { FIG_VIEWBOX, MJK101_LENGTH, MJK101_PATH, MJK101_SPAN } from './mjk101';

/**
 * §02's figure: the aircraft MJK designed, drawn as a general arrangement.
 *
 * WHY THIS IS ALLOWED TO EXIST NOW. An earlier research pass ruled a blueprint out, and
 * was right to at the time: the corpus held the words "100 passengers or 28 in business
 * class" and no geometry whatsoever, so any drawing would have been an artist's
 * impression of a generic airliner with his name on it. Then MJK sent the Airbus
 * presentation, which turns out to carry his own CAD plan view and a full specification
 * table. The outline below is TRACED from that render and the numbers beside it are from
 * that table, both now in `content/memories.yaml` as `mjk-101`. Nothing here is invented,
 * which is the only reason it is on the page.
 *
 * WHY IT IS STATIC AT REST. Measured on this site at 375x812 under 4x CPU throttle: a
 * static SVG costs 24.9ms at p95 against a 24.6ms baseline, inside run-to-run noise,
 * while a perpetually looping animation cost 11% of the framerate and took the worst
 * frame from 66ms to 92ms. So the drawing-on happens once, when the section first comes
 * into view, and then nothing moves for the rest of the visit.
 *
 * WHY IT IS CASED RATHER THAN HALOED. The scene behind this is bright thin lines on
 * black, and so is a line drawing; at low alpha the two read as the same material and the
 * figure dissolves into the filaments. Every stroke is therefore painted twice, once fat
 * in the background colour underneath and once in the accent on top, and the text uses
 * `paint-order: stroke`. That is the page's halo rule moved from blur into geometry,
 * which is the whole trick: a halo is a Gaussian and costs raster; a casing is a second
 * path and costs nothing.
 */
export default function MJK101Figure() {
  const ref = useRef<HTMLElement>(null);

  /*
   * `data-arrived` is set on the DOM node rather than held in React state, and that is
   * the same decision the dock makes for `--dock-h` and the flight makes for
   * `data-flying`. Nothing in the tree reads this value, only CSS does, so routing it
   * through state would buy a re-render of a hundred-odd SVG nodes and change nothing
   * anyone can see. It also keeps the reduced-motion path from calling setState inside
   * an effect, which is a cascading render for a class name.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion gets the finished drawing, not a faster one. That preference asks
    // for less movement, and a general arrangement is a static object by nature.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.setAttribute('data-arrived', '');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        // A third of it on screen, not a single pixel: the point is that it draws while
        // being read, not that it finishes before the section arrives.
        if (entries.some((e) => e.isIntersecting)) {
          el.setAttribute('data-arrived', '');
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="fig-ga" ref={ref}>
      <svg viewBox={FIG_VIEWBOX} role="img" aria-labelledby="ga-title">
        <title id="ga-title">
          Plan view of the MJK-101, a high-wing dual-role airliner with two underwing engines and a
          T-tail, with its wingspan and length dimensioned.
        </title>

        {/* The casing pass. Same geometry, fat, in the background colour, underneath. */}
        <path className="ga-case" d={MJK101_PATH} />
        {/*
          `pathLength` renormalises the outline's own arc length to 1, so the CSS can
          draw it on with `stroke-dasharray: 1` and never has to know how long it
          actually is. The first version guessed 1400 and the trace is longer than that,
          which left the port wing sitting in a permanent dash gap.
        */}
        <path className="ga-ink" d={MJK101_PATH} pathLength={1} />

        <g className="ga-dims" aria-hidden="true">
          {/* Extension lines: they tie each dimension back to the feature it measures. */}
          <line className="ga-ext" x1={MJK101_SPAN.x0} y1={MJK101_SPAN.y - 4} x2={MJK101_SPAN.x0} y2={MJK101_SPAN.y - 26} />
          <line className="ga-ext" x1={MJK101_SPAN.x1} y1={MJK101_SPAN.y - 4} x2={MJK101_SPAN.x1} y2={MJK101_SPAN.y - 26} />
          <line className="ga-ext" x1={MJK101_LENGTH.x + 4} y1={MJK101_LENGTH.y0} x2={MJK101_LENGTH.x + 62} y2={MJK101_LENGTH.y0} />
          <line className="ga-ext" x1={MJK101_LENGTH.x + 4} y1={MJK101_LENGTH.y1} x2={MJK101_LENGTH.x + 62} y2={MJK101_LENGTH.y1} />

          {/* Span, measured under the wing tips. */}
          <line x1={MJK101_SPAN.x0} y1={MJK101_SPAN.y} x2={MJK101_SPAN.x1} y2={MJK101_SPAN.y} />
          <line x1={MJK101_SPAN.x0} y1={MJK101_SPAN.y - 4} x2={MJK101_SPAN.x0} y2={MJK101_SPAN.y + 4} />
          <line x1={MJK101_SPAN.x1} y1={MJK101_SPAN.y - 4} x2={MJK101_SPAN.x1} y2={MJK101_SPAN.y + 4} />
          <text
            className="ga-label"
            x={(MJK101_SPAN.x0 + MJK101_SPAN.x1) / 2}
            y={MJK101_SPAN.y - 5}
            textAnchor="middle"
          >
            110 ft
          </text>

          {/* Length, measured beside the fuselage. */}
          <line x1={MJK101_LENGTH.x} y1={MJK101_LENGTH.y0} x2={MJK101_LENGTH.x} y2={MJK101_LENGTH.y1} />
          <line x1={MJK101_LENGTH.x - 4} y1={MJK101_LENGTH.y0} x2={MJK101_LENGTH.x + 4} y2={MJK101_LENGTH.y0} />
          <line x1={MJK101_LENGTH.x - 4} y1={MJK101_LENGTH.y1} x2={MJK101_LENGTH.x + 4} y2={MJK101_LENGTH.y1} />
          <text
            className="ga-label ga-label-v"
            x={MJK101_LENGTH.x - 6}
            y={(MJK101_LENGTH.y0 + MJK101_LENGTH.y1) / 2}
            textAnchor="middle"
          >
            97 ft
          </text>
        </g>
      </svg>

      <figcaption className="fig-ga-cap">
        <span className="fig-ga-name">MJK-101</span>
        <span>
          The Brunel Airbus project: a dual-role airliner, 100 passengers on short European routes or
          28 in business class across continents, out of London City.
        </span>
      </figcaption>
    </figure>
  );
}
