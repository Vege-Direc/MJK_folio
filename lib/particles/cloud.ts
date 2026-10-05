/**
 * Point clouds: two ways to sample one, and one way to pair two.
 *
 * WHY THIS IS NOT IN `dust.ts` ANY MORE. That module is the engine-to-aircraft
 * transition and it is written as one: it samples SVG path data, because an engine and an
 * aeroplane ARE their edges. The intro portrait cannot use any of that. A face is not its
 * edges — Davies, Ellis and Shepherd 1978 found line drawings with every edge preserved
 * are extremely hard to recognise, Bruce et al. 1992 found the same drawings become
 * recognisable the moment the light and dark pattern is added back, and photographic
 * negation destroys recognition while changing no edge's size, position or extent. So the
 * portrait has to be sampled from TONE, and edge tracing of any kind — Canny, potrace,
 * an SDF, a landmark mesh — fails at every resolution rather than at a low one.
 *
 * What the two DO share is everything downstream of the sampler: a cloud is a flat
 * `Float32Array`, two clouds are paired by putting both in the same canonical order, and
 * the per-particle constants the frame loop needs are precomputed once. Copying that into
 * a second file would have been a fork, and forks drift. So the source-agnostic half moved
 * here and `components/stops/dust.ts` kept the SVG sampler and its own animation; its
 * exports and its behaviour are unchanged, and `MJK101Figure` did not have to be touched.
 */

/** A paired cloud, flattened. Stride 10, see `PAIR_STRIDE`. */
export type Dust = { xy: Float32Array; n: number };

/** ax, ay, dx, dy, nx, ny, rx, ry, s, phase */
export const PAIR_STRIDE = 10;

const TAU = Math.PI * 2;

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
export function order(pts: Float32Array, bins = 64): Uint32Array {
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
 * Pair two clouds and precompute everything a morph's frame loop needs.
 *
 * Per particle the loop wants: where it starts, how far it goes, the unit normal to its own
 * chord (that is the direction the wave displaces it), a unit vector away from the cloud
 * centre (that is the direction it breathes), its position along the wave axis, and a phase
 * offset. All of it is fixed for the run, so none of it belongs in the frame loop.
 */
export function pairClouds(A: Float32Array, B: Float32Array): Dust {
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

/** One mark: where it sits in the 0..1 unit box, and how bright that part of the source is. */
export type ToneCloud = {
  /** x, y, tone — stride 3, `x` and `y` in 0..1 with y down. */
  xyv: Float32Array;
  n: number;
};

/**
 * A luminance map, as `make-portrait.ts` writes it: 4 bits a cell, row-major, base64.
 *
 * Four bits because the marks are what carry the picture and there are only ~2,000 of
 * them. Sixteen levels is finer than the eye can separate in a dot field of that density,
 * and it halves a byte-per-cell map to 3,456 bytes for a 72x96 grid — which gzips to
 * roughly 2 kB in the entry bundle. Eight bits would have bought nothing visible.
 */
export type ToneMap = {
  w: number;
  h: number;
  /** Row-major, two cells per byte, high nibble first. Base64. */
  data: string;
};

/** Decode a `ToneMap` to a `w*h` Float32Array of 0..1. */
export function decodeTone({ w, h, data }: ToneMap): Float32Array {
  const bin = atob(data);
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) {
    const byte = bin.charCodeAt(i >> 1);
    const nib = i & 1 ? byte & 0xf : byte >> 4;
    out[i] = nib / 15;
  }
  return out;
}

/**
 * The luminance sampler: a tone map becomes `n` marks, placed by brightness.
 *
 * THE FAMILY THIS BELONGS TO, AND WHY. This is a tone quantiser — the same family as
 * ASCII art, halftone and ordered dither — and it is the only family the face-perception
 * literature supports for rendering a face at low mark counts. The mark count that matters
 * was measured on this project's own frames: between about 27 and 47 marks across the head
 * width, 27 marginal and 47 clear. `sqrt(n / 1.35)` puts 2,000 marks at 38 across, which is
 * why 2,000 is the number and why the earlier estimate of 6,000-8,000 was wrong by 3x.
 *
 * HOW THE MARKS ARE PLACED. Not one per grid cell — a regular lattice reads as a printed
 * screen, and the scene it hands over to is dust. Cells are drawn WITH REPLACEMENT in
 * proportion to their tone above `floor`, so bright regions get more marks and the dark
 * ground gets none, and each mark is jittered inside its own cell. That is stratified
 * importance sampling with a blue-ish jitter, and it gives a field whose local density is
 * the picture — which is the property that survives the whole thing coming apart into
 * particles, because density is still legible when position is not.
 *
 * DETERMINISTIC ON PURPOSE. A 32-bit xorshift seeded by argument, not `Math.random`: the
 * intro has to look the same on a reload, and a screenshot of it has to be comparable with
 * the last one. Same reasoning as `dust.ts`'s phase hash.
 *
 * @param tone  w*h luminance, 0..1, row-major, y down.
 * @param floor Tone below which no mark is placed. The dark ground is not drawn.
 */
export function sampleTone(
  tone: Float32Array,
  w: number,
  h: number,
  n: number,
  floor = 0.1,
  seed = 0x9e3779b9,
): ToneCloud {
  // The cumulative weight of every cell above the floor, so a cell can be picked in
  // proportion to its brightness with one binary search per mark.
  const cdf = new Float32Array(w * h);
  let total = 0;
  for (let i = 0; i < w * h; i++) {
    const v = tone[i];
    /*
     * Slightly UNDER linear, and the first version had it the other way round for a
     * reason that turned out to be wrong.
     *
     * A regular halftone lattice puts one mark per cell, so the mark's own size and alpha
     * are the only things that can carry tone and both must ramp hard. This is not a
     * lattice: density carries tone as well. Weighting the draw at tone^1.35 on top of a
     * size ramp and an alpha ramp made the total light land at roughly tone^3.7, and the
     * result is in the record — the lit side of the face fused into one white mass with
     * no brow, no socket and no nose in it, which is precisely the failure the whole tone
     * approach exists to avoid. 0.9 leaves the mid-tones populated and lets size and
     * alpha add the last little bit of contrast rather than all of it.
     */
    total += v > floor ? Math.pow((v - floor) / (1 - floor), 0.9) : 0;
    cdf[i] = total;
  }
  const xyv = new Float32Array(n * 3);
  if (!(total > 0)) return { xyv: xyv.subarray(0, 0), n: 0 };

  let s = seed >>> 0;
  const rand = () => {
    // xorshift32 — three shifts, no allocation, and the same sequence everywhere.
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };

  for (let k = 0; k < n; k++) {
    const target = rand() * total;
    // Binary search for the first cell whose cumulative weight passes the target.
    let lo = 0, hi = w * h - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const cx = lo % w, cy = (lo / w) | 0;
    const o = k * 3;
    xyv[o] = (cx + rand()) / w;
    xyv[o + 1] = (cy + rand()) / h;
    xyv[o + 2] = tone[lo];
  }
  return { xyv, n };
}
