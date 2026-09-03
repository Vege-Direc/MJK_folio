'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { ENGINE, FIG_VIEWBOX, MJK101_LENGTH, MJK101_PATH, MJK101_SPAN, MORPH } from './mjk101';

/**
 * §02's figure: a two-stroke engine that becomes the aircraft he designed.
 *
 * WHY IT EXISTS. The stop is titled "Mechanical, then aerospace." and carried three
 * sentences over empty scene. It then carried a screenshot of the Visual Basic engine
 * simulator he wrote in 2010, which was real evidence and looked wrong — MJK's verdict was
 * that it "doesn't look good here or fit the overall aesthetic of the website". What is
 * here now performs the title rather than illustrating it.
 *
 * WHY IT IS ALLOWED TO CLAIM WHAT IT CLAIMS. A general arrangement of the aircraft was
 * ruled out once, correctly: the corpus held "100 passengers or 28 in business class" and
 * no geometry at all, so any drawing would have been an artist's impression of a generic
 * airliner with his name on it. Then he sent the Airbus presentation, which carries his
 * own CAD plan view and a full specification table. The outline is traced from that render
 * and the dimensions are read off that table, both now in the corpus as `mjk-101`. The
 * engine is drawn rather than traced, and is deliberately the RD 350's architecture — an
 * air-cooled two-stroke parallel twin, which the corpus also licenses. It is a drawing of
 * a type, not a portrait of a particular part.
 *
 * WHY THE MOTION IS SHAPED THE WAY IT IS. Measured on this site at 375x812 under 4x CPU
 * throttle: a static SVG costs 24.9ms at p95 against a 24.6ms baseline, inside run-to-run
 * noise, while a perpetually looping animation cost 11% of the framerate and took the
 * worst frame from 66ms to 92ms. So this runs once, when the section first comes into
 * view, and is static for the rest of the visit. The particles are mounted only for the
 * ~1.6s they are needed and unmounted afterwards, so the resting page carries one path,
 * one casing and a handful of dimension lines — nothing that animates and nothing that
 * costs a frame.
 */

/**
 * How long each phase lasts, in milliseconds.
 *
 * Slower than the first attempt, which MJK described as transitioning "too fast and then
 * disappears". The disappearing half was a plain bug — the reveal rules were still keyed
 * on an attribute the rewrite had stopped setting, so the aircraft drew itself with an
 * invisible stroke. The too-fast half was real: 2.5 seconds for a machine to become an
 * aeroplane is long enough to notice something happened and too short to watch it.
 */
const HOLD = 1400; // the engine, alone, long enough to be read as an engine
const SCATTER = 900; // strokes give way to dots
const FLY = 1700; // dots cross to the planform

type Phase = 'engine' | 'scatter' | 'fly' | 'plane';

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export default function MJK101Figure() {
  const ref = useRef<HTMLElement>(null);
  const [advanced, setAdvanced] = useState<Phase | null>(null);
  const timers = useRef<number[]>([]);

  /*
   * Read through `useSyncExternalStore` rather than in the effect. The preference has to
   * be known during render — it decides which branch of the tree exists at all — and
   * setting it from an effect is a cascading render for a decision that was available
   * before the first paint. The server snapshot is `false`, which is the honest answer:
   * a server has no preference to report, and the first client render corrects it.
   */
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

  /*
   * Reduced motion goes straight to the aircraft, and that is a content decision as much
   * as a motion one. The figure's subject is the MJK-101: it is the dimensioned artefact
   * and it is what the caption is about. The engine is the first clause of the sentence.
   * Someone who has asked for less movement gets the subject immediately, rather than a
   * faster version of a transition they did not want.
   */
  const phase: Phase = reduced ? 'plane' : (advanced ?? 'engine');

  /*
   * One run, and a control to run it again. Not a loop.
   *
   * MJK asked whether it should loop or carry a control. A perpetual loop is the one thing
   * this site has measured and rejected: an animation that never stops cost 11% of the
   * framerate and took the worst frame from 66ms to 92ms, and it would sit in the corner
   * of the eye of someone reading the paragraph beside it. A replay control gives the same
   * access to the sequence and asks nothing of a visitor who does not want it — the same
   * bargain the RD 350's before-and-after strikes, where motion happens because a finger
   * asked for it.
   */
  const run = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setAdvanced('engine');
    timers.current.push(window.setTimeout(() => setAdvanced('scatter'), HOLD));
    timers.current.push(window.setTimeout(() => setAdvanced('fly'), HOLD + SCATTER));
    timers.current.push(window.setTimeout(() => setAdvanced('plane'), HOLD + SCATTER + FLY));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        // A third of it on screen, not a single pixel: the point is that it runs while
        // being watched, not that it finishes before the section arrives.
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        run();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    const held = timers.current;
    return () => {
      io.disconnect();
      held.forEach(window.clearTimeout);
    };
  }, [reduced, run]);

  const dots = phase === 'scatter' || phase === 'fly';

  return (
    <figure className="fig-ga" ref={ref} data-phase={phase}>
      <svg viewBox={FIG_VIEWBOX} role="img" aria-labelledby="ga-title">
        <title id="ga-title">
          {reduced
            ? 'Plan view of the MJK-101, a high-wing dual-role airliner with two underwing engines and a T-tail, with its wingspan and length dimensioned.'
            : 'A two-stroke parallel-twin motorcycle engine, drawn in isometric, which scatters into particles and reforms as the plan view of the MJK-101: a high-wing dual-role airliner with two underwing engines and a T-tail, with its wingspan and length dimensioned.'}
        </title>

        {phase === 'engine' || phase === 'scatter' ? (
          <g className="ga-engine" aria-hidden="true">
            {ENGINE.map(([kind, d], i) => (
              <path key={i} className={kind === 'face' ? 'ga-eface' : 'ga-eline'} d={d} />
            ))}
          </g>
        ) : null}

        {dots ? (
          <g className="ga-dust" aria-hidden="true">
            {MORPH.map(([x0, y0, x1, y1], i) => (
              <circle
                key={i}
                r={1.15}
                /*
                 * Both endpoints ride as custom properties so the whole flight is a single
                 * CSS transition on `transform`: compositor work, no per-frame JavaScript,
                 * and nothing that touches the raster threads the halo already taxes. The
                 * stagger comes off the index rather than a random number, so the cloud
                 * reads as one body turning rather than as static.
                 */
                style={
                  {
                    '--x0': `${x0}px`,
                    '--y0': `${y0}px`,
                    '--x1': `${x1}px`,
                    '--y1': `${y1}px`,
                    '--d': `${(i % 25) * 9}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </g>
        ) : null}

        {phase === 'plane' ? (
          <>
            {/* The casing pass: the same geometry, fat, in the background colour, underneath. */}
            <path className="ga-case" d={MJK101_PATH} />
            {/*
              `pathLength` renormalises the outline's own arc length to 1, so the CSS can
              draw it on with `stroke-dasharray: 1` and never has to know how long it is.
              An earlier version guessed 1400 against a real length of 874, which left the
              port wing sitting in a permanent dash gap with only its casing showing.
            */}
            <path className="ga-ink" d={MJK101_PATH} pathLength={1} />

            <g className="ga-dims" aria-hidden="true">
              {/* Extension lines, tying each dimension back to the feature it measures. */}
              <line className="ga-ext" x1={MJK101_SPAN.x0} y1={MJK101_SPAN.y - 4} x2={MJK101_SPAN.x0} y2={MJK101_SPAN.y - 26} />
              <line className="ga-ext" x1={MJK101_SPAN.x1} y1={MJK101_SPAN.y - 4} x2={MJK101_SPAN.x1} y2={MJK101_SPAN.y - 26} />
              <line className="ga-ext" x1={MJK101_LENGTH.x + 4} y1={MJK101_LENGTH.y0} x2={MJK101_LENGTH.x + 62} y2={MJK101_LENGTH.y0} />
              <line className="ga-ext" x1={MJK101_LENGTH.x + 4} y1={MJK101_LENGTH.y1} x2={MJK101_LENGTH.x + 62} y2={MJK101_LENGTH.y1} />

              <line x1={MJK101_SPAN.x0} y1={MJK101_SPAN.y} x2={MJK101_SPAN.x1} y2={MJK101_SPAN.y} />
              <line x1={MJK101_SPAN.x0} y1={MJK101_SPAN.y - 4} x2={MJK101_SPAN.x0} y2={MJK101_SPAN.y + 4} />
              <line x1={MJK101_SPAN.x1} y1={MJK101_SPAN.y - 4} x2={MJK101_SPAN.x1} y2={MJK101_SPAN.y + 4} />
              <text className="ga-label" x={(MJK101_SPAN.x0 + MJK101_SPAN.x1) / 2} y={MJK101_SPAN.y - 5} textAnchor="middle">
                110 ft
              </text>

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
          </>
        ) : null}
      </svg>

      <figcaption className="fig-ga-cap">
        <span className="fig-ga-head">
          <span className="fig-ga-name">MJK-101</span>
          {/*
            Only offered once the sequence has finished, and never under reduced motion.
            A replay control that appears mid-run invites a visitor to interrupt the thing
            they are being shown, and under reduced motion there is no sequence to replay.
          */}
          {!reduced && phase === 'plane' ? (
            <button type="button" className="fig-ga-replay" onClick={run}>
              Replay
            </button>
          ) : null}
        </span>
        <span>
          The Brunel Airbus project: a dual-role airliner, 100 passengers on short European routes or
          28 in business class across continents, out of London City.
        </span>
      </figcaption>
    </figure>
  );
}
