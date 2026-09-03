/**
 * The cloud that carries the engine across to the aircraft.
 *
 * WHY IT IS NOT SVG ANY MORE. MJK asked for "denser and smaller particles to simulate wave
 * particle motion between transitions". Denser is not reachable in the DOM: measured at
 * 390x844 under 4x CPU throttle, 150 SVG circles on CSS transitions run at 60fps, 800 run
 * at 21fps, 2,400 at 6fps, and 4,000 completed no frames at all in three 1.95s runs. So the
 * ceiling on the old technique was about 150, which is where it already was.
 *
 * WHY CANVAS 2D AND NOT WEBGL. Same harness, same particles. At 2,400 particles canvas 2D
 * costs 17.4ms a frame and WebGL costs 18.6ms — WebGL is SLOWER here, because at this count
 * the per-frame cost is the clear and the uniform upload, not the points. It only overtakes
 * above about 4,500, by which point canvas 2D has already left 60fps behind and so has the
 * budget. A third GL context on a page that already runs three.js, to be slower, is not a
 * trade worth making. `fillRect` per particle also beat accumulating one big Path2D and
 * filling once (17.4ms against 18.9ms at 2,400): building the path costs more than the
 * draw calls save.
 *
 * WHY THE ENDPOINTS ARE NOT GENERATED DATA. They used to be: `MORPH`, 150 hand-generated
 * `[x0,y0,x1,y1]` pairs, about 4KB of the module. 2,000 pairs the same way would have been
 * 55KB. Instead both clouds are sampled at runtime off the path data the module already
 * ships, with `getPointAtLength`. That is zero bytes for any particle count, and it means
 * the cloud is sampled from the WHOLE drawing — every engine face and every interior line
 * of the aircraft — rather than from the outer silhouette alone. At 150 a cloud can only
 * afford to trace a boundary; at 2,000 it can be the drawing, so the scatter reads as the
 * drawing coming apart and the arrival reads as the next one assembling.
 */

/** Both clouds, flattened. Stride 10, see `PAIR_STRIDE`. */
export type Dust = { xy: Float32Array; n: number };

/** ax, ay, dx, dy, nx, ny, rx, ry, s, phase */
const PAIR_STRIDE = 10;

const TAU = Math.PI * 2;

/**
 * Sample `n` points along a set of SVG path strings, in proportion to arc length.
 *
 * The host is a real element in the document rather than a detached one: `getPointAtLength`
 * is specified on rendered geometry, and Safari has historically wanted the element to be in
 * a document even though nothing needs to be painted. `visibility: hidden` keeps the layout
 * box that guarantees that while painting nothing.
 */
function samplePaths(ds: readonly string[], n: number): Float32Array {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 232');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText =
    'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  document.body.appendChild(svg);

  const els: SVGPathElement[] = [];
  const lens: number[] = [];
  let total = 0;
  try {
    for (const d of ds) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
      const L = p.getTotalLength();
      if (!(L > 0.5)) continue;
      els.push(p);
      lens.push(L);
      total += L;
    }

    const out = new Float32Array(n * 2);
    let w = 0;
    for (let i = 0; i < els.length && w < n; i++) {
      // Rounded up, so a short path still gets one point rather than vanishing; the loop
      // stops at n, so the longest paths give up the slack rather than the shortest.
      const k = Math.min(n - w, Math.max(1, Math.round((n * lens[i]) / total)));
      for (let j = 0; j < k; j++) {
        // The half-step offset keeps two abutting paths from doubling a particle on their
        // shared endpoint, which showed up as bright dots at every corner of the engine.
        const pt = els[i].getPointAtLength((lens[i] * (j + 0.5)) / k);
        out[w * 2] = pt.x;
        out[w * 2 + 1] = pt.y;
        w++;
      }
    }
    return w === n ? out : out.slice(0, w * 2);
  } finally {
    svg.remove();
  }
}

/**
 * Put a cloud in a canonical order so two different clouds can be paired.
 *
 * Each cloud is first normalised to its own bounding box, because the engine is 199x186 and
 * the aircraft is 282x131 and a raw angle about the centroid would map the aircraft's
 * wingtips onto the engine's cylinder heads. In that normalised space the sort is by coarse
 * angular bin first and radius second, so a particle keeps BOTH its bearing and its depth:
 * the outside of one drawing becomes the outside of the other, and the inside the inside.
 * Sorting on angle alone let particles from deep inside the crankcase land on a wingtip,
 * which reads as scatter rather than as one thing becoming another.
 */
function order(pts: Float32Array, bins = 64): Uint32Array {
  const n = pts.length / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const sx = 2 / Math.max(1e-6, x1 - x0), sy = 2 / Math.max(1e-6, y1 - y0);
  const key = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const u = (pts[i * 2] - x0) * sx - 1;
    const v = (pts[i * 2 + 1] - y0) * sy - 1;
    const a = (Math.atan2(v, u) + Math.PI) / TAU;         // 0..1
    const r = Math.min(1, Math.hypot(u, v) / Math.SQRT2); // 0..1
    key[i] = Math.floor(a * bins) + r;                    // bin dominates, radius breaks ties
  }
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  return idx.sort((a, b) => key[a] - key[b]);
}

/**
 * Pair the two clouds and precompute everything the frame loop needs.
 *
 * Per particle the loop wants: where it starts, how far it goes, the unit normal to its own
 * chord (that is the direction the wave displaces it), a unit vector away from the cloud
 * centre (that is the direction it breathes), its position along the wave axis, and a phase
 * offset. All of it is fixed for the run, so none of it belongs in the frame loop.
 */
export function buildDust(engine: readonly string[], plane: readonly string[], n: number): Dust {
  const A = samplePaths(engine, n);
  const B = samplePaths(plane, n);
  const m = Math.min(A.length, B.length) / 2;
  const ia = order(A), ib = order(B);

  const xy = new Float32Array(m * PAIR_STRIDE);
  let cx = 0, cy = 0, minx = Infinity, maxx = -Infinity;
  for (let i = 0; i < m; i++) {
    const ax = A[ia[i] * 2], ay = A[ia[i] * 2 + 1];
    cx += ax;
    cy += ay;
    if (ax < minx) minx = ax;
    if (ax > maxx) maxx = ax;
  }
  cx /= m;
  cy /= m;
  const span = Math.max(1e-6, maxx - minx);

  for (let i = 0; i < m; i++) {
    const ax = A[ia[i] * 2], ay = A[ia[i] * 2 + 1];
    const bx = B[ib[i] * 2], by = B[ib[i] * 2 + 1];
    const dx = bx - ax, dy = by - ay;
    const L = Math.hypot(dx, dy) || 1;
    const rx = ax - cx, ry = ay - cy;
    const R = Math.hypot(rx, ry) || 1;
    const o = i * PAIR_STRIDE;
    xy[o] = ax;
    xy[o + 1] = ay;
    xy[o + 2] = dx;
    xy[o + 3] = dy;
    xy[o + 4] = -dy / L;                 // unit normal to the chord
    xy[o + 5] = dx / L;
    xy[o + 6] = rx / R;                  // unit vector out of the cloud
    xy[o + 7] = ry / R;
    xy[o + 8] = (ax - minx) / span;      // position along the wave axis, 0..1
    // A deterministic hash, not Math.random: the same run twice has to look the same, and
    // Replay is the whole point of the control in the caption.
    xy[o + 9] = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * TAU;
  }
  return { xy, n: m };
}

export type DustOptions = {
  /** How long the cloud forms and loosens before it flies. */
  scatter: number;
  /** How long the crossing takes. */
  fly: number;
  /** How long it keeps drawing, fading, after arrival, while the outline draws itself on. */
  settle: number;
  colour: string;
};

/** Cubic ease. Slow out of the engine, slow into the aircraft, quick between. */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/*
 * The wave.
 *
 * MJK asked for motion that reads as a wave rather than as dots sliding, and the shape of
 * the answer matters more than the amount of it. A per-particle random wobble is not a
 * wave — it is noise, and at 2,000 particles it reads as static. What makes a medium look
 * like a medium is COHERENCE: neighbours agree, and the disturbance travels.
 *
 * So the phase of every particle's transverse displacement is a function of where it sits
 * along the figure, not of its index. Particles at the same station move together; the
 * whole cloud carries `WAVES` full wavelengths across its width; and the term in `u` makes
 * the pattern travel through the cloud rather than standing still in it. `JITTER` is small
 * on purpose — just enough that the sheet has grain and does not read as a printed sine.
 *
 * `SWEEP` is the other half of it. The crossing does not start everywhere at once: it
 * begins at the left of the figure and the wavefront takes 45% of the timeline to reach the
 * right, so the transformation propagates through the cloud instead of being applied to it.
 *
 * The envelope is `sin(pi * p)` — on the particle's OWN progress `p`, not on the shared
 * clock `u`, which appears only in the travelling term. That distinction is the whole
 * point of the envelope, and it is load-bearing for correctness rather than for looks:
 * `ease(p)` reaches exactly 1 and `sin(pi * p)` reaches exactly 0 at the same instant, so
 * the transverse displacement vanishes precisely where the particle arrives, and the cloud
 * resolves INTO the drawing rather than near it. Put the envelope on `u` instead and every
 * particle that the wavefront reached early is still being pushed sideways after it has
 * landed. A noise field would give no such guarantee for free, which is the other reason
 * this is a sine and not curl noise.
 *
 * `LOOSEN` is the one term that outlives `p`: it decays on `(1 - u)`, so a particle that
 * arrives early keeps a sub-pixel drift — under 1 unit — until the whole wave has landed at
 * `u = 1`, which is the instant the outline starts drawing itself on. That is deliberate;
 * it stops the early half of the cloud going rigid while the late half is still in flight.
 */
const WAVES = 2.3;
const AMP = 11;
const OMEGA = TAU * 1.35;
const JITTER = 0.55;
const SWEEP = 0.45;
const BREATH = 7;
const LOOSEN = 3.4;

/**
 * Draw the cloud into `canvas` for `scatter + fly + settle` ms. Returns a cancel function.
 *
 * The canvas backing store is capped at 2x rather than following devicePixelRatio, which is
 * 3 on the phone this was measured on. A particle is about one CSS pixel; at 3x the fill
 * area is 2.25 times larger than at 2x for a dot nobody can see the extra resolution in.
 */
export function runDust(
  canvas: HTMLCanvasElement,
  dust: Dust,
  { scatter, fly, settle, colour }: DustOptions,
): () => void {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let cw = 0, ch = 0, k = 1;
  /*
   * Re-read the box every frame and only touch the backing store when it actually moved.
   * A `clientWidth` read costs a layout flush, but it happens once per frame before any
   * writes, and the alternative — sizing once at the start — leaves the cloud drawn at the
   * old scale for the rest of the run if the phone is rotated or the keyboard closes
   * mid-transition. Three seconds is long enough for that to happen.
   */
  const resize = () => {
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 232;
    if (w === cw && h === ch) return;
    cw = w;
    ch = h;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    k = cw / 300;
  };
  resize();

  const { xy, n } = dust;
  const total = scatter + fly + settle;
  let raf = 0;
  // -1 rather than 0 as the "not started" sentinel. `if (!t0)` is the idiom here and it is
  // wrong: a timestamp of 0 is legal — it is what `document.timeline.currentTime` is at
  // document creation, and it is what any harness that drives the loop by hand will pass —
  // and the falsy test re-epochs on every such frame, so elapsed time never leaves 0 and
  // nothing is ever drawn. Found by frame-stepping this loop to look at the wave.
  let t0 = -1;

  // Particles are sized in CSS pixels, not user units, so the dust has the same grain at
  // 300px as at 580px. Sub-pixel rects are anti-aliased by the canvas, which is what turns
  // 2,000 hard squares into something that reads as powder.
  const size = 1.15;
  const half = size / 2;

  const frame = (t: number) => {
    if (t0 < 0) t0 = t;
    const e = t - t0;
    resize();
    ctx.clearRect(0, 0, cw, ch);

    // form and loosen, then fly, then hold while fading out under the arriving outline
    const form = Math.min(1, e / scatter);
    const u = Math.min(1, Math.max(0, (e - scatter) / fly));
    const done = Math.max(0, (e - scatter - fly) / Math.max(1, settle));
    const loose = form * (1 - u);
    ctx.globalAlpha = Math.min(form * 1.4, 1) * (1 - done * done);
    ctx.fillStyle = colour;

    for (let i = 0; i < n; i++) {
      const o = i * PAIR_STRIDE;
      const s = xy[o + 8];
      // the wavefront reaches this station at s * SWEEP, and then it has the rest to cross
      const p = Math.min(1, Math.max(0, (u - s * SWEEP) / (1 - SWEEP)));
      const g = ease(p);
      const env = Math.sin(Math.PI * p);
      const ph = xy[o + 9];
      const w = AMP * env * Math.sin(TAU * WAVES * s - u * OMEGA + ph * JITTER);
      const br = BREATH * env + LOOSEN * loose * (0.6 + 0.4 * Math.sin(ph));
      const x = xy[o] + xy[o + 2] * g + xy[o + 4] * w + xy[o + 6] * br;
      const y = xy[o + 1] + xy[o + 3] * g + xy[o + 5] * w + xy[o + 7] * br;
      ctx.fillRect(x * k - half, y * k - half, size, size);
    }

    if (e < total) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, cw, ch);
  };
}
