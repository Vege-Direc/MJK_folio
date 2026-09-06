/**
 * The opening: a tone-quantised portrait that assembles, holds, and is zoomed through
 * into the scene.
 *
 * WHY IT IS ELASTIC AND NOT A DURATION. A fixed 3-5s animation is a timer, not a load
 * screen, and the two only coincide by luck. The scene chunk is 140,024 B gzipped — about
 * 1.04s of transfer at Fast 3G's 1.6 Mbit/s — so a fixed head-to-tail either invents
 * seconds of wait on a fast connection or ends on an empty canvas on a slow one. This has
 * a fixed head, a HOLD that ends when the scene actually starts fading up, and a fixed
 * tail. A floor so it never flashes; a ceiling so it never becomes the wait.
 *
 * THE NUMBERS, AND WHY THEY ARE SHORTER THAN THE FIRST SPEC. The original shape was
 * 900 / [500,1700] / 2,000, giving X = 3,400ms and Y = 4,600ms — Y chosen to sit under
 * WCAG 2.2.2's five seconds. The owner has since said 1-2s is fine "depending on how you
 * build it", and shorter is the right reading of that for a reason the first pass had
 * backwards: at the ceiling the gate is no longer covering a load, it IS the load.
 * Holding someone for 4.6s to hide a canvas that would otherwise fade up gently over an
 * already-readable page buys nothing, because the fallback is not a broken page — it is
 * the page. So the ceiling is set by attention, not by the network:
 *
 *   HEAD 620 → HOLD [340 … 1,500] → TAIL 780.   X = 1,740ms.   Y = 2,900ms.
 *
 * X is inside the owner's stated 1-2s. Y is 2.1s clear of the five-second threshold, so
 * 2.2.2 is not merely satisfied but never engaged, and it is under Nielsen's 10s limit of
 * attention by a factor of three. The band the gate genuinely covers is a scene ready by
 * 2,120ms, which is most desktop and 4G arrivals. On Fast 3G the scene is ready at about
 * 4.0s even with eager loading, so the gate lifts about 1.1s before it — onto the
 * server-rendered hero over the same dark ground the scene fades up from. That is stated
 * rather than hidden: the honest ceiling does not cover the worst network, and inflating
 * it until it did would make every other visitor wait for that one.
 *
 * WHY THE PORTRAIT IS DOTS AND NOT A WIREFRAME. A face is carried by tone, not by edges.
 * See `scripts/make-portrait.ts` for the four papers and what each of them rules out.
 *
 * WHY CANVAS 2D AND NOT THE THREE.JS SCENE. The scene is exactly what this is covering.
 * It cannot draw its own load screen. Measured in `dust.ts` on the same shape: 2,000
 * particles cost 17.4ms a frame at 390x844 under 4x CPU throttle in canvas 2D and 18.6ms
 * in WebGL, because at this count the cost is the clear and the upload rather than the
 * points.
 */
import { PALETTE } from './config';
import { decodeTone, sampleTone, type ToneMap } from '@/lib/particles/cloud';

/** Every duration the gate has, in one place, because two of them are also in CSS. */
export const INTRO = {
  /** The portrait assembles. Fixed: it is the beat the visitor is being asked to watch. */
  HEAD_MS: 620,
  /** The floor. Below this the face has assembled and vanished without being read. */
  HOLD_MIN_MS: 340,
  /** The ceiling. Past this the gate has stopped covering a load and become one. */
  HOLD_MAX_MS: 1500,
  /** Zoom, disperse, and hand over. Overlaps the scene's own 700ms opacity ramp. */
  TAIL_MS: 780,
  /** A skip, a scroll, a key. Short enough to feel like an answer rather than a queue. */
  DISMISS_MS: 220,
  /**
   * The CSS dead man's switch, in `intro.css` as `intro-expire`.
   *
   * IT IS MEASURED FROM FIRST PAINT, NOT FROM THE FIRST FRAME, and that is what sets the
   * number. A CSS animation starts when the element is rendered, which is before the
   * bundle has hydrated and therefore before the gate's own clock exists. So this is not
   * "Y plus a margin" — it is "hydration plus Y", and 4,600ms leaves about 1.7s of
   * hydration headroom over the 2,900ms ceiling before it would ever truncate a healthy
   * run. It stays under five seconds, which is what keeps the whole gate clear of WCAG
   * 2.2.2 whatever else fails.
   *
   * `IntroGate` listens for its `animationend` and ends the gate properly when it fires.
   * Without that the CSS would hide the overlay while `data-intro` stayed on and the page
   * beneath stayed `inert` — an invisible overlay holding a dead page, which is a worse
   * failure than the one the dead man exists to prevent.
   */
  EXPIRE_MS: 4600,
  /**
   * Measured rather than chosen. Legibility was found between 27 and 47 marks across the
   * head — 27 marginal, 47 clear — and `sqrt(n / 1.35)` puts 2,600 at 44, near the clear
   * end. 2,000 was tried first, lands at 38, and rendered a head whose eye line and
   * nostril would not separate; the cost of the other 600 is 30% more `drawImage` calls
   * on a 2-second animation. The earlier estimate of 6,000-8,000 was wrong by about 3x,
   * which is why the performance objection to drawing a face this way does not stand.
   */
  MARKS: 2600,
} as const;

/** X and Y: the shortest and longest the gate can last. Stated so a test can hold them. */
export const INTRO_FLOOR_MS = INTRO.HEAD_MS + INTRO.HOLD_MIN_MS + INTRO.TAIL_MS;
export const INTRO_CEILING_MS = INTRO.HEAD_MS + INTRO.HOLD_MAX_MS + INTRO.TAIL_MS;

/**
 * When the tail starts, given when the scene began fading up.
 *
 * `null` means it has not — or never will, which `MindCanvas` reports the same way for a
 * machine with no WebGL and for a chunk that 404'd. Both come out as the ceiling, which
 * is the only answer that does not wait forever.
 */
export function tailStartsAt(revealAtMs: number | null): number {
  const earliest = INTRO.HEAD_MS + INTRO.HOLD_MIN_MS;
  const latest = INTRO.HEAD_MS + INTRO.HOLD_MAX_MS;
  if (revealAtMs === null) return latest;
  return Math.min(latest, Math.max(earliest, revealAtMs));
}

/**
 * Where the figure sits in the viewport, in CSS pixels.
 *
 * Width is capped against BOTH axes on purpose. Height alone put a 490px-tall figure
 * inside a 390px-wide phone, which is 367px of shoulders across a 390px screen — the
 * portrait touching both edges reads as a crop, not as a person. The mark count is
 * constant, so the head lands at about 38 marks across at every size this returns: that
 * is the whole reason a full-screen gate is the only shape in which a phone visitor ever
 * sees the portrait at all.
 */
export function figureBox(vw: number, vh: number) {
  const w = Math.min(0.66 * vh * 0.75, 0.72 * vw);
  const h = w / 0.75;
  return { x: (vw - w) / 2, y: 0.4 * vh - h / 2, w, h };
}

const TAU = Math.PI * 2;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t: number) => t * t * t;

/*
 * The wave, and it is the same wave as the engine-to-aircraft transition on §07 — the
 * owner asked for "the particle combination and dispersion with affects (similar to
 * engine to plane)", and the family resemblance is the point rather than a coincidence.
 *
 * Coherence is what makes a medium look like a medium: neighbours agree and the
 * disturbance travels. So the phase of a particle's transverse displacement is a function
 * of where it sits across the figure, not of its index, and `SWEEP` makes the assembly
 * start at one side and cross. The envelope is `sin(pi * p)` on the particle's OWN
 * progress, which is what makes the displacement vanish exactly where the particle
 * arrives — the cloud resolves INTO the portrait rather than near it.
 */
const WAVES = 2.1;
const SWEEP = 0.42;
const OMEGA = TAU * 1.2;
const JITTER = 0.5;

/** Stride 8: tx, ty, ox, oy, nx, ny, rx, ry — all in unit-box coordinates. */
const STRIDE = 8;

export type PortraitCloud = {
  /** Stride 8, see above. */
  a: Float32Array;
  /** Which tone bucket each mark belongs to. */
  bucket: Uint8Array;
  /** A deterministic per-mark phase, so two runs look the same. */
  phase: Float32Array;
  n: number;
  /** How many buckets `bucket` indexes. */
  buckets: number;
};

/**
 * Ten buckets, because the alternative is 2,000 `fillStyle` writes a frame.
 *
 * Every mark's colour and radius is a function of its tone alone, so tone is the only
 * thing that has to vary per draw — and quantising it to ten levels lets the loop set
 * state ten times and then issue 2,000 draws. Ten is past the point where a denser field
 * shows a band, which was checked against the rendered field rather than assumed.
 */
const BUCKETS = 10;

/**
 * Build the cloud once: where every mark lands, where it flies in from, and the two unit
 * vectors the frame loop displaces it along.
 *
 * The start offset is radial from the mark's own target rather than a second sampled
 * cloud, and that is a deliberate difference from `dust.ts`. There, two real drawings are
 * paired and the ordering decides which cylinder head becomes which wingtip. Here the
 * "before" is not a picture — it is dispersal — so a particle should arrive from the
 * direction it belongs in, which a per-mark radial offset gives directly and a paired
 * random cloud only approximates.
 */
export function buildPortraitCloud(tone: ToneMap, headCx: number, headCy: number, n: number): PortraitCloud {
  const grid = decodeTone(tone);
  const { xyv, n: m } = sampleTone(grid, tone.w, tone.h, n);
  const a = new Float32Array(m * STRIDE);
  const bucket = new Uint8Array(m);
  const phase = new Float32Array(m);

  let s = 0x2545f491;
  const rand = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };

  for (let i = 0; i < m; i++) {
    const tx = xyv[i * 3];
    const ty = xyv[i * 3 + 1];
    const v = xyv[i * 3 + 2];

    // Outward from the head, which is both the direction the mark flies in from and the
    // direction it leaves in. One vector, two beats, and the symmetry is visible: what
    // assembled from the dark goes back to it.
    let rx = tx - headCx;
    let ry = (ty - headCy) * 0.75;   // the box is 3:4, so equalise before normalising
    const R = Math.hypot(rx, ry) || 1;
    rx /= R;
    ry /= R;

    /*
     * Scattered around the outward direction, not along it, and the first version got
     * this wrong in a way that was only visible once it was on screen.
     *
     * A purely radial offset is an explosion run backwards: every mark leaves along its
     * own radius, so at t=0 there is a mark-shaped HOLE exactly the size and shape of the
     * figure, ringed by dust. The opening frame read as a void with a halo — an object
     * announcing its own absence — rather than as a field about to become something.
     *
     * Rotating each offset by up to +/-60 degrees fills the middle back in while keeping
     * the bulk of the travel outward, so the assembly still resolves from the edges and
     * the first frame is a cloud. Distance runs 0.14 to 1.0 of the box width: near enough
     * that some marks barely move, far enough that none of it is legible at the start.
     */
    const ang = (rand() - 0.5) * (Math.PI / 1.5);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const dx = rx * ca - ry * sa;
    const dy = rx * sa + ry * ca;
    const dist = 0.14 + 0.86 * rand();
    const ox = dx * dist;
    const oy = dy * dist * 0.75;

    const L = Math.hypot(ox, oy) || 1;
    const o = i * STRIDE;
    a[o] = tx;
    a[o + 1] = ty;
    a[o + 2] = ox;
    a[o + 3] = oy;
    a[o + 4] = -oy / L;   // unit normal to the chord: the direction the wave displaces it
    a[o + 5] = ox / L;
    a[o + 6] = rx;
    a[o + 7] = ry;
    bucket[i] = Math.min(BUCKETS - 1, Math.floor(v * BUCKETS));
    phase[i] = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * TAU;
  }
  return { a, bucket, phase, n: m, buckets: BUCKETS };
}

/**
 * One soft sprite per bucket, drawn once into an offscreen canvas.
 *
 * `fillRect` is what `dust.ts` uses and it is right there: those marks are one CSS pixel
 * and a square that small is a dot. These are not — the brightest run to about 1.2x the
 * mark pitch, six or seven pixels on a desktop, and a six-pixel square reads as a tile.
 * A pre-rendered radial sprite is round, has a soft rim, composites additively into the
 * same glow the scene's own materials make, and costs one `drawImage` a mark.
 *
 * THE RAMPS ARE FLATTER THAN THE HALFTONE PROTOTYPE'S, and that correction is the whole
 * difference between a face and a white smear. `quantise.py` drew one mark per grid cell,
 * so its mark size and alpha had to carry all of the tone. Here the SAMPLER already
 * varies density with tone, and the marks composite additively — so ramping size and
 * alpha as hard as well multiplied three encodings of the same quantity together. The
 * measured result: the lit half of the head fused into one white mass with no brow, no
 * eye socket and no nose in it. Diameter now runs 0.44 to 0.72 of the mark pitch, so
 * neighbours barely overlap, and alpha 0.45 to 0.80. Colour still carries the top end,
 * which is where a highlight should read.
 */
function buildSprites(pitch: number, dpr: number): HTMLCanvasElement[] {
  const dim = [(PALETTE.node >> 16) & 255, (PALETTE.node >> 8) & 255, PALETTE.node & 255];
  const mid = [(PALETTE.particle >> 16) & 255, (PALETTE.particle >> 8) & 255, PALETTE.particle & 255];
  const hot = [255, 255, 255];
  const out: HTMLCanvasElement[] = [];
  for (let b = 0; b < BUCKETS; b++) {
    const u = (b + 0.5) / BUCKETS;
    const r = pitch * (0.36 + 0.16 * Math.pow(u, 0.75));
    const alpha = Math.min(1, 0.26 + 0.26 * Math.pow(u, 0.85));
    const t = Math.min(1, u * 1.6);
    let c = dim.map((d, i) => d + (mid[i] - d) * t);
    // White starts at 0.85 rather than 0.72: the brow and the lit cheekbone both sit in
    // the top third of the range, and starting the white ramp lower fused them into one
    // highlight with the eye socket between them erased.
    if (u > 0.85) c = mid.map((mv, i) => mv + (hot[i] - mv) * ((u - 0.85) / 0.15));
    const px = Math.max(2, Math.ceil(r * 2 * dpr) + 2);
    const cv = document.createElement('canvas');
    cv.width = px;
    cv.height = px;
    const g = cv.getContext('2d');
    if (g) {
      const half = px / 2;
      const grad = g.createRadialGradient(half, half, 0, half, half, half);
      const rgb = `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])}`;
      grad.addColorStop(0, `rgba(${rgb},${alpha})`);
      grad.addColorStop(0.45, `rgba(${rgb},${alpha * 0.75})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, px, px);
    }
    out.push(cv);
  }
  return out;
}

export type IntroElements = {
  canvas: HTMLCanvasElement;
  /** The opaque plate the particles sit on; its opacity is the handover. */
  ground: HTMLElement;
  /** Gets `data-intro-out` when the tail starts, so the CSS can fade it. */
  copy: HTMLElement;
};

/**
 * A tone map plus where the head is in it. `head` is the one value a new photograph is
 * most likely to change, and the zoom is aimed at its centre.
 */
export type PortraitSource = ToneMap & { head: { cx: number; cy: number } };

export type IntroRun = {
  /** Cut to the exit now — a skip, a scroll, a key. Idempotent. */
  dismiss(): void;
  /** The scene has started fading up. The HOLD ends at the next frame that allows it. */
  sceneRevealed(): void;
  /** Tear down without an exit animation. For React's cleanup. */
  stop(): void;
};

/**
 * Draw the gate. `onDone` fires once, when the last frame has been drawn.
 */
export function runIntro(els: IntroElements, tone: PortraitSource, onDone: () => void): IntroRun {
  const { canvas, ground, copy } = els;
  const ctx = canvas.getContext('2d', { alpha: true });
  let raf = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    onDone();
  };
  if (!ctx) {
    // No 2D context is not a reason to hold the page. Hand over immediately.
    finish();
    return { dismiss: finish, sceneRevealed() {}, stop: finish };
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let vw = 0, vh = 0;
  let box = figureBox(1, 1);
  let pitch = 1;
  let sprites: HTMLCanvasElement[] = [];

  const layout = () => {
    const w = window.innerWidth || 360;
    const h = window.innerHeight || 640;
    if (w === vw && h === vh) return;
    vw = w;
    vh = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    box = figureBox(w, h);
    // The mark pitch the count implies over the drawn part of the figure. 0.45 is the
    // fraction of the tone map above the draw floor, which `make-portrait.ts` prints; it
    // only has to be about right, because it sets grain and not legibility.
    pitch = Math.sqrt((box.w * box.h * 0.45) / INTRO.MARKS);
    sprites = buildSprites(pitch, dpr);
  };
  layout();

  const cloud = buildPortraitCloud(tone, tone.head.cx, tone.head.cy, INTRO.MARKS);
  const { a, bucket, phase, n } = cloud;
  // Marks grouped by bucket, so the loop sets its sprite ten times instead of 2,000.
  const byBucket: Uint32Array[] = [];
  for (let b = 0; b < BUCKETS; b++) {
    const idx: number[] = [];
    for (let i = 0; i < n; i++) if (bucket[i] === b) idx.push(i);
    byBucket.push(Uint32Array.from(idx));
  }

  let t0 = -1;
  let revealAt: number | null = null;
  let dismissedAt: number | null = null;
  let lastGround = -1;

  const frame = (t: number) => {
    if (t0 < 0) t0 = t;
    const e = t - t0;
    layout();

    // ── where in the story are we ──────────────────────────────────────────────
    const tailAt = dismissedAt ?? tailStartsAt(revealAt);
    const tailMs = dismissedAt === null ? INTRO.TAIL_MS : INTRO.DISMISS_MS;
    const inTail = e >= tailAt;
    const u3 = inTail ? Math.min(1, (e - tailAt) / tailMs) : 0;
    const u1 = Math.min(1, e / INTRO.HEAD_MS);
    // The sentence leaves when the tail starts, not when the scene reports itself: the
    // scene can be ready before the floor, and the words going while the portrait is
    // still holding reads as a mistake. Fading OUT is safe for LCP; it is fading IN from
    // `opacity: 0` that Shopify measured a six-second regression from, and this element
    // is painted at full strength in the server HTML and never animates up.
    if (inTail && !copy.dataset.introOut) {
      copy.dataset.introOut = dismissedAt === null ? 'yes' : 'fast';
    }

    // ── the plate, and with it the handover ───────────────────────────────────
    // The scene is already fading up underneath on its own 700ms ramp, so this is a
    // cross-fade and not a cut. It starts at 45% of the tail: before that the zoom has
    // to happen against a solid ground or it reads as a dissolve rather than a move.
    const g = 1 - Math.min(1, Math.max(0, (u3 - 0.45) / 0.55));
    if (g !== lastGround) {
      ground.style.opacity = g >= 1 ? '' : g.toFixed(3);
      lastGround = g;
    }

    ctx.clearRect(0, 0, vw, vh);
    // Additive, because every material in the scene this hands over to is additive and
    // the dark ground is the same #0a0a0e in both. Overlapping marks glow rather than
    // stack, which is what makes the lit cheek read as light and not as more dots.
    ctx.globalCompositeOperation = 'lighter';

    // ── the zoom ───────────────────────────────────────────────────────────────
    // Into the head, about the head's own centre, easing IN — a zoom that starts fast
    // reads as a cut. 3.4x is enough that the face leaves the frame rather than merely
    // growing, which is what makes it a move through and not a scale.
    const k = 1 + 2.4 * easeIn(u3);
    const hx = box.x + box.w * tone.head.cx;
    const hy = box.y + box.h * tone.head.cy;

    const fade = inTail ? Math.max(0, 1 - Math.pow(u3, 1.6)) : 1;

    for (let b = 0; b < BUCKETS; b++) {
      const sprite = sprites[b];
      const list = byBucket[b];
      if (!list.length) continue;
      const sw = sprite.width / dpr;
      // Bucket alpha is baked into the sprite; this is the only per-frame alpha, and it
      // is one write per bucket rather than one per mark.
      ctx.globalAlpha = fade;
      for (let j = 0; j < list.length; j++) {
        const i = list[j];
        const o = i * STRIDE;
        const s = a[o];                                       // 0..1 across the figure
        // The wavefront reaches this station at s * SWEEP and then has the rest to cross.
        const p = Math.min(1, Math.max(0, (u1 - s * SWEEP) / (1 - SWEEP)));
        const gp = easeInOut(p);
        const env = Math.sin(Math.PI * p);
        const ph = phase[i];

        // Assemble: the start offset is paid off as `gp` reaches 1.
        let x = a[o] + a[o + 2] * (1 - gp);
        let y = a[o + 1] + a[o + 3] * (1 - gp);
        // The travelling transverse wave, in box units.
        const wv = 0.028 * env * Math.sin(TAU * WAVES * s - u1 * OMEGA + ph * JITTER);
        x += a[o + 4] * wv;
        y += a[o + 5] * wv;
        // The HOLD is not a freeze. A sub-pixel radial breath keeps the field alive
        // while the scene builds behind it; without it the portrait goes to a still and
        // the visitor reads the pause as the page having stopped.
        if (!inTail) {
          const br = 0.0045 * Math.sin(t * 0.0016 + ph);
          x += a[o + 6] * br;
          y += a[o + 7] * br;
        } else {
          // Disperse: outward from the head, quadratic so it is a burst rather than a
          // slide, and the far marks leave first because the zoom multiplies distance.
          const d = 0.34 * u3 * u3 * (0.55 + 0.45 * Math.sin(ph));
          x += a[o + 6] * d;
          y += a[o + 7] * d;
        }

        const px = hx + (box.x + x * box.w - hx) * k;
        const py = hy + (box.y + y * box.h - hy) * k;
        // Off-frame marks are the majority once the zoom is running; not drawing them is
        // most of why the tail costs less than the head rather than more.
        if (px < -sw || py < -sw || px > vw + sw || py > vh + sw) continue;
        /*
         * A mark grows into its own size as it lands, from half.
         *
         * The alternative — ramping alpha — would be a `globalAlpha` write per mark, 2,600
         * state changes a frame, which is exactly the cost the bucket grouping exists to
         * avoid. `drawImage` already takes a destination size, so scaling the sprite is
         * free, and a smaller sprite of the same colour IS dimmer: it puts less light on
         * the page. So the cloud arrives rather than being switched on, and the frame loop
         * keeps its ten state changes.
         */
        const sz = inTail ? sw : sw * (0.5 + 0.5 * gp);
        ctx.drawImage(sprite, px - sz / 2, py - sz / 2, sz, sz);
      }
    }
    ctx.globalAlpha = 1;

    if (inTail && u3 >= 1) {
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    dismiss() {
      if (finished || dismissedAt !== null) return;
      // From wherever we are, not from the start of a tail that has not begun. Reading
      // `performance.now()` rather than waiting for the next frame keeps a skip press
      // from being a frame late on a slow machine.
      dismissedAt = t0 < 0 ? 0 : performance.now() - t0;
      copy.dataset.introOut = 'fast';
    },
    sceneRevealed() {
      // 0 rather than a bail-out when no frame has run yet: a scene that revealed before
      // the gate's first frame is the fastest case there is, and treating it as "not yet
      // revealed" would hold that visitor for the full ceiling.
      if (revealAt !== null) return;
      revealAt = t0 < 0 ? 0 : performance.now() - t0;
    },
    stop: finish,
  };
}
