'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAsk } from '../chat/ChatProvider';
import { buildDust, runDust, type Dust } from './dust';
import { ENGINE, FIG_VIEWBOX, MJK101_INNER, MJK101_PATH } from './mjk101';

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
const SCATTER = 900; // strokes give way to dust
const FLY = 1700; // the cloud crosses to the planform
/*
 * The tail. The cloud used to be cut off the instant the aircraft appeared, and at 150
 * dots that read as a swap; at 2,000 it read as a pop. So the canvas keeps drawing for
 * another 420ms, fading, while the outline draws itself on underneath — the two halves
 * overlap instead of butting together, and the dust looks like it settled INTO the drawing.
 */
const SETTLE = 420;

/**
 * How many particles. Not a taste number: measured at 390x844 under 4x CPU throttle,
 * canvas 2D holds ~58fps at 2,400 and starts falling off at 3,200 (47fps). 2,000 sits
 * inside that with room for the wave arithmetic the benchmark did not include.
 */
const PARTICLES = 2000;

type Phase = 'engine' | 'scatter' | 'fly' | 'plane';

/**
 * The aircraft is the answer to exactly one memory. Everything else this stop knows — the
 * mechanical degree at BITS, the fabrication internships, the Visual Basic engine
 * simulator — belongs to the engine.
 */
const AIRCRAFT_MEMORY = 'mjk-101';

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
   * The canvas exists only while a run is in flight. At rest the figure is one outline,
   * a handful of interior curves and a title block — nothing that animates, nothing that
   * holds a drawing context.
   */
  const [running, setRunning] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dust = useRef<Dust | null>(null);
  const stopDust = useRef<(() => void) | null>(null);

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
  /*
   * Which half of the figure the answer is about.
   *
   * MJK asked about his BITS education, landed here, and was shown an aeroplane. The
   * figure already holds both states — it is an engine that becomes the MJK-101 — and it
   * simply always rested on the aircraft. So retrieval chooses now: if the answer was
   * licensed by the aircraft's own memory it rests on the aircraft, and otherwise on the
   * engine, which is what every other memory on this stop is about.
   *
   * This is generative UI of the only kind this site allows. The choice comes from the
   * memory ids the guard licensed the answer against, so it is deterministic and the model
   * has no say in it — the same rule that governs which section an answer lands in at all.
   */
  /*
   * Decided ONCE per question, off the FIRST envelope, and then frozen.
   *
   * `answer.envelope` is the latest envelope, and two late server paths deliberately
   * rewrite `cites` down to the two memories a fallback's prose actually came from — a
   * provider failure, and a guard verdict with nothing salvageable (`handler.ts`, the
   * `replaceWith` path). The first envelope carries the full licensed set,
   * `licences.map(m => m.id)`. So a question that hit `mjk-101` three licences out of six
   * showed the aircraft, and then, seconds later, reverted to the engine underneath a
   * caption about the Brunel Airbus project. The narrowing is right on the server's own
   * terms: those really are the memories that fallback prose came from. Reading it is
   * what is wrong, because this figure is answering "what is this answer about", not
   * "which sentences survived".
   *
   * Keyed on the question text, not on the envelope or on `answer`: both are fresh
   * objects on every streamed token, so keying on either would re-latch continuously and
   * reintroduce the bug. Adjusted during render rather than in an effect, which is the
   * same bargain `ChatProvider` strikes for `showOriginal` — an effect renders one frame
   * with the previous question's answer still on screen and then corrects itself, and
   * here that frame is a visible flip of the whole drawing.
   */
  const { answer } = useAsk();
  const question = answer?.question ?? null;
  const envelope = answer?.envelope ?? null;

  const [latch, setLatch] = useState<{ q: string | null; seen: boolean; at: Phase | null }>({
    q: null,
    seen: false,
    at: null,
  });

  const read = (): Phase | null => {
    if (envelope?.stopId !== 'engineering') return null;
    if (!envelope.cites?.length) return null;
    return envelope.cites.includes(AIRCRAFT_MEMORY) ? 'plane' : 'engine';
  };

  let rests = latch.at;
  if (question !== latch.q) {
    // A new question is a new subject. Take this envelope if one has already arrived.
    const next = { q: question, seen: envelope !== null, at: read() };
    setLatch(next);
    rests = next.at;
  } else if (!latch.seen && envelope !== null) {
    // The first envelope for this question. The only one this figure ever reads.
    const next = { q: question, seen: true, at: read() };
    setLatch(next);
    rests = next.at;
  }

  const phase: Phase = rests ?? (reduced ? 'plane' : (advanced ?? 'engine'));

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
    stopDust.current?.();
    stopDust.current = null;
    setAdvanced('engine');
    setRunning(true);

    /*
     * Sample both clouds during the hold, not at the transition.
     *
     * 2,000 `getPointAtLength` calls across 165 paths is single-digit milliseconds on a
     * desktop and tens on a throttled phone — cheap, but not cheap enough to spend on the
     * frame where the engine gives way. The hold is 1,400ms of a figure that is doing
     * nothing, so the work goes there, one tick after the engine has painted. It is kept
     * on the ref because the geometry never changes: Replay reuses the same cloud, which
     * is also why the per-particle phase is a hash of the index rather than a random
     * number — the second run has to look like the first.
     */
    timers.current.push(
      window.setTimeout(() => {
        dust.current ??= buildDust(
          ENGINE.map(([, d]) => d),
          [MJK101_PATH, ...MJK101_INNER],
          PARTICLES,
        );
      }, 0),
    );

    timers.current.push(
      window.setTimeout(() => {
        setAdvanced('scatter');
        const el = canvas.current;
        if (!el || !dust.current) return;
        stopDust.current = runDust(el, dust.current, {
          scatter: SCATTER,
          fly: FLY,
          settle: SETTLE,
          // Read off the element rather than hard-coded, so the drawing follows the theme
          // token the way every stroke in the SVG beside it does.
          colour:
            getComputedStyle(el).getPropertyValue('--color-accent').trim() || '#d4c19c',
        });
      }, HOLD),
    );
    timers.current.push(window.setTimeout(() => setAdvanced('fly'), HOLD + SCATTER));
    timers.current.push(window.setTimeout(() => setAdvanced('plane'), HOLD + SCATTER + FLY));
    timers.current.push(
      window.setTimeout(() => setRunning(false), HOLD + SCATTER + FLY + SETTLE),
    );
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
      stopDust.current?.();
    };
  }, [reduced, run]);

  return (
    <figure className="fig-ga" ref={ref} data-phase={phase}>
      {/*
        The stage exists so the canvas can sit exactly on the drawing. It carries the
        figure's aspect ratio, the SVG fills it, and the canvas is absolutely positioned
        over it — one wrapper rather than measuring the SVG's box in JavaScript.
      */}
      <div className="fig-ga-stage">
      <svg viewBox={FIG_VIEWBOX} role="img" aria-labelledby="ga-title">
        <title id="ga-title">
          {reduced
            ? 'A three-quarter view of the MJK-101, a high-wing dual-role airliner with two underwing engines and a T-tail, beside its wingspan, length and range.'
            : 'A two-stroke parallel-twin motorcycle engine, drawn in isometric, which scatters into particles and reforms as the MJK-101: a high-wing dual-role airliner with two underwing engines and a T-tail, seen from the same three-quarter angle.'}
        </title>

        {phase === 'engine' || phase === 'scatter' ? (
          <g className="ga-engine" aria-hidden="true">
            {ENGINE.map(([kind, d], i) => (
              <path key={i} className={kind === 'face' ? 'ga-eface' : 'ga-eline'} d={d} />
            ))}
          </g>
        ) : null}

        {phase === 'plane' ? (
          <>
            {/* The casing pass: the same geometry, fat, in the background colour, underneath. */}
            <path className="ga-case" d={MJK101_PATH} />
            {MJK101_INNER.map((d, i) => (
              <path key={`c${i}`} className="ga-case ga-case-thin" d={d} />
            ))}

            {/*
              `pathLength` renormalises the outline's own arc length to 1, so the CSS can
              draw it on with `stroke-dasharray: 1` and never has to know how long it is.
              An earlier version guessed 1400 against a real length of 874, which left the
              port wing sitting in a permanent dash gap with only its casing showing.
            */}
            <path className="ga-ink" d={MJK101_PATH} pathLength={1} />

            {/*
              The structural lines, drawn after the silhouette and slightly later, so the
              aircraft arrives as an outline and then gains its depth rather than both at
              once. Without them a three-quarter view reads as a flat blob.
            */}
            <g className="ga-inner">
              {MJK101_INNER.map((d, i) => (
                <path key={i} className="ga-iline" d={d} pathLength={1} />
              ))}
            </g>

            {/*
              A title block rather than dimension lines. On a plan view a span arrow
              measures what it points at; on a three-quarter view it would measure a
              foreshortened projection and quietly lie about it. Every figure here is
              licensed by `mjk-101` in the corpus.
            */}
            <g className="ga-block" aria-hidden="true">
              <line x1={18} y1={188} x2={128} y2={188} />
              <text x={18} y={202}>WINGSPAN</text>
              <text x={122} y={202} textAnchor="end">110 FT</text>
              <text x={18} y={214}>LENGTH</text>
              <text x={122} y={214} textAnchor="end">97 FT</text>
              <text x={18} y={226}>RANGE</text>
              <text x={122} y={226} textAnchor="end">4112 NM</text>
            </g>
          </>
        ) : null}
      </svg>

      {running ? <canvas ref={canvas} className="fig-ga-dust" aria-hidden="true" /> : null}
      </div>

      {/*
        The caption follows the figure. Resting on the engine under a caption about an
        airliner would be the same mistake in a different place.
      */}
      <figcaption className="fig-ga-cap">
        <span className="fig-ga-head">
          <span className="fig-ga-name">{phase === 'plane' ? 'MJK-101' : 'TWO-STROKE TWIN'}</span>
          {/*
            Only offered once the sequence has finished, and never under reduced motion.
            A replay control that appears mid-run invites a visitor to interrupt the thing
            they are being shown, and under reduced motion there is no sequence to replay.
          */}
          {!reduced && phase === 'plane' ? (
            <button type="button" className="fig-ga-replay" onClick={run}>
              {/*
                MJK's question was "where is loop btw?", which is the answer to whether the
                control was discoverable: it was 10px of dimmed mono at 0.18em tracking, and
                he did not see it. What was missing is not size, it is the SIGN that this is
                a control rather than a label — a word set like a caption reads as caption.
                The glyph is what fixes that, and it makes one single turn as it arrives, so
                the thing that says "replayable" happens exactly once, in the corner of the
                eye, at the moment there is finally something to replay. Not a loop: a
                perpetual animation on this page measured -11% framerate and took the worst
                frame from 66ms to 92ms, and this one would sit beside a paragraph someone
                is trying to read.
              */}
              <svg className="fig-ga-replay-mark" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M13.2 6.4A5.6 5.6 0 1 0 13.4 9.9" />
                <path d="M13.6 2.4v4.2h-4.2" />
              </svg>
              Replay
            </button>
          ) : null}
        </span>
        <span>
          {phase === 'plane'
            ? 'The Brunel Airbus project: a dual-role airliner, 100 passengers on short European routes or 28 in business class across continents, out of London City.'
            : 'An air-cooled parallel twin — the architecture of the 1986 Yamaha RD 350 I stripped to the frame and rebuilt.'}
        </span>
      </figcaption>
    </figure>
  );
}
