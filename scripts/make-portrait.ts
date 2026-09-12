/**
 * Build `lib/mind/portrait-tone.ts` — the luminance map the intro gate quantises into
 * dots. One command, one generated file, and it is the ONLY thing that has to change when
 * a real photograph arrives.
 *
 *   npx tsx scripts/make-portrait.ts                       # regenerate the placeholder
 *   npx tsx scripts/make-portrait.ts path/to/portrait.jpg  # use a real photograph
 *   npx tsx scripts/make-portrait.ts p.jpg --crop 120,340,520,700
 *
 * THE FLAGS, AND WHICH ONES A NEW PHOTOGRAPH ACTUALLY NEEDS.
 *
 *   --crop l,t,w,h            the 3:4 box in source pixels
 *   --head cx,cy,halfW,halfH  where the head sits in that box, 0..1. The gate ZOOMS at it
 *   --matte lo0,lo1,hi0,hi1[,keepLo]   chroma band-pass: see PHOTO_MATTE
 *   --open r,a,b              opens the matte so thin slivers go: see PHOTO_OPEN
 *   --contrast pivot,k,knee   the tone curve: see PHOTO_CURVE
 *   --unsharp a               local contrast, default 0.7
 *
 * Only `--crop` and `--head` are always needed. The other three exist because the first
 * real photograph had a room in it, and each is documented at the function that uses it
 * with the measurement that forced it. A photograph shot to the brief — head and
 * shoulders, DARK PLAIN BACKGROUND, one soft key at about 45 degrees with real fill —
 * needs none of them, and that is still the photograph to ask for.
 *
 * WHY A TONE MAP AND NOT A TRACE. A face is carried by tone, not by edges. Davies, Ellis
 * and Shepherd 1978 found line drawings that preserve every edge are extremely hard to
 * recognise; Bruce et al. 1992 found the same drawings become recognisable once the light
 * and dark pattern is restored; Bruce et al. 1991 found 3D surface shape without texture
 * is a poor identity cue; and photographic negation destroys recognition while changing no
 * edge's position, size or extent. So Canny, potrace, imagetracerjs, an SDF, a depth
 * displacement and a face-landmark mesh all fail here — not at low resolution, at any
 * resolution. A tone quantiser is the family that works, and it needs directional light
 * far more than it needs pixels.
 *
 * WHY 72x96 AT FOUR BITS. The gate draws about 2,000 marks, which is roughly 38 across the
 * head — inside the 27-to-47 legibility band this project measured on its own frames. A
 * grid finer than the mark pitch cannot be seen, and sixteen tone levels cannot be
 * separated by eye in a dot field of that density. 72x96 at 4bpp is 3,456 bytes, about
 * 2 kB gzipped in the bundle, and it is decoded once at runtime.
 *
 * THE PLACEHOLDER IS NOT A LIKENESS AND MUST NOT SHIP AS ONE. With no argument this
 * writes a synthetic head: implicit surfaces, Lambertian shading, a key light from the
 * upper left. It exists so the pipeline, the composition and the animation can be built
 * and judged before a photograph exists. `PORTRAIT.placeholder` is `true` for it, and the
 * gate refuses to claim it is anyone.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Output grid. */
const W = 72;
const H = 96;
/** The placeholder is shaded at 4x and box-filtered down, so the tone is smooth. */
const SS = 4;

// ── the placeholder head ──────────────────────────────────────────────────────

/**
 * A Lambertian head from implicit surfaces, lit from the upper left.
 *
 * Ported from the vision pass's `face.py` rather than re-invented, because the point of
 * the placeholder is to produce what the research says works — a luminance map with
 * directional light — at the size and place the real portrait will occupy. The feature
 * displacements are that file's, value for value.
 */
function syntheticTone(w: number, h: number): Float32Array {
  const z = new Float32Array(w * h);
  const inside = new Uint8Array(w * h);
  const hairMask = new Float32Array(w * h);
  const half = w / 2;

  const X = (i: number) => (i - w / 2) / half;
  const Y = (j: number) => (h / 2 - j) / half;

  const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
    Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

  const aHead = 0.62, bHead = 0.86, cyHead = 0.1;

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = X(i), y = Y(j);
      const k = j * w + i;
      const jaw = 1 - 0.3 * Math.min(1, Math.max(0, (cyHead - y) / 0.95)) ** 2.1;
      const rx = aHead * jaw;
      const q = (x / rx) ** 2 + ((y - cyHead) / bHead) ** 2;
      inside[k] = q <= 1 ? 1 : 0;
      let zz = Math.sqrt(Math.max(0, 1 - q)) * 0.72;

      // brow ridge out, sockets in, nose ridge out, nostrils in, lips, philtrum,
      // cheekbones, chin, temples — the light-and-dark pattern that carries a face.
      zz += 0.055 * gauss(x, y, -0.24, 0.3, 0.2, 0.055);
      zz += 0.055 * gauss(x, y, 0.24, 0.3, 0.2, 0.055);
      zz -= 0.085 * gauss(x, y, -0.25, 0.2, 0.155, 0.075);
      zz -= 0.085 * gauss(x, y, 0.25, 0.2, 0.155, 0.075);
      zz += 0.03 * gauss(x, y, -0.25, 0.185, 0.085, 0.045);
      zz += 0.03 * gauss(x, y, 0.25, 0.185, 0.085, 0.045);
      zz += 0.115 * gauss(x, y, 0, 0.06, 0.075, 0.3);
      zz += 0.075 * gauss(x, y, 0, -0.14, 0.105, 0.075);
      zz -= 0.07 * gauss(x, y, -0.11, -0.17, 0.045, 0.045);
      zz -= 0.07 * gauss(x, y, 0.11, -0.17, 0.045, 0.045);
      zz -= 0.05 * gauss(x, y, 0, -0.255, 0.16, 0.038);
      zz += 0.045 * gauss(x, y, 0, -0.225, 0.19, 0.045);
      zz += 0.04 * gauss(x, y, 0, -0.315, 0.17, 0.05);
      zz += 0.045 * gauss(x, y, -0.36, 0.02, 0.16, 0.16);
      zz += 0.045 * gauss(x, y, 0.36, 0.02, 0.16, 0.16);
      zz += 0.05 * gauss(x, y, 0, -0.52, 0.22, 0.13);
      zz -= 0.045 * gauss(x, y, -0.52, 0.36, 0.13, 0.2);
      zz -= 0.045 * gauss(x, y, 0.52, 0.36, 0.13, 0.2);
      z[k] = zz;

      const hairR = (x / (rx * 1.09)) ** 2 + ((y - cyHead - 0.06) / (bHead * 1.03)) ** 2;
      const hairline = y > 0.52 - 0.09 * Math.cos(x * 3) - 0.06 * Math.abs(x);
      hairMask[k] =
        hairR <= 1 && y > cyHead - 0.1 && (hairline || Math.abs(x) > rx * 0.86) ? 1 : 0;
    }
  }

  // Normals from the height field, then a key light from the upper left. The terminator
  // is steepened past Lambert because a real key light falls off faster than a cosine.
  const step = 2 / w;
  const Lv = [-0.46, 0.5, 0.73];
  const Ln = Math.hypot(Lv[0], Lv[1], Lv[2]);
  const L = Lv.map((v) => v / Ln);
  const Hv = [L[0], L[1], L[2] + 1];
  const Hn = Math.hypot(Hv[0], Hv[1], Hv[2]);
  const Hh = Hv.map((v) => v / Hn);

  const shade = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const zl = z[k - (i > 0 ? 1 : 0)], zr = z[k + (i < w - 1 ? 1 : 0)];
      const zu = z[k - (j > 0 ? w : 0)], zd = z[k + (j < h - 1 ? w : 0)];
      const gx = (zr - zl) / (2 * step);
      // y runs up in the maths and down in the buffer, so the vertical slope flips sign.
      const gy = (zu - zd) / (2 * step);
      const nx = -gx, ny = -gy, nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      const lam = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / nl);
      const sp = Math.max(0, (nx * Hh[0] + ny * Hh[1] + nz * Hh[2]) / nl) ** 26;
      const x = X(i), y = Y(j);
      /*
       * More ambient and a softer terminator than the vision pass's `face.py`, and the
       * change was forced by the rendered dot field rather than by taste.
       *
       * At `0.10 + 0.86 * lam` with a `0.55 + 0.45` terminator, the shadow side of the
       * head fell below the quantiser's draw floor entirely: the marks stopped, and what
       * came out was half a face with a hard vertical edge down the middle of the nose.
       * A tone quantiser needs directional light, which is the finding — but directional
       * is not the same as unfilled, and a key with no fill deletes exactly the half of
       * the face that tells you it is a head and not a mask. This is roughly a 3:1 key to
       * fill, which is also the note the real photograph needs.
       */
      let s = 0.22 + 0.74 * lam + 0.26 * sp;
      s *= 0.7 + 0.3 * Math.min(1.4, Math.max(0, x * -0.6 + y * 0.35 + 0.75));
      // Hair is a dark mass and it is most of what makes a head read as a head.
      if (hairMask[k]) s = s * 0.26 + 0.05;
      shade[k] = s;
    }
  }

  const blur = (a: Float32Array, r: number): Float32Array => {
    if (r < 1) return a;
    const g: number[] = [];
    let sum = 0;
    for (let d = -r; d <= r; d++) {
      const v = Math.exp(-(d * d) / (2 * (r / 2.2) ** 2));
      g.push(v);
      sum += v;
    }
    for (let i = 0; i < g.length; i++) g[i] /= sum;
    const t = new Float32Array(a.length);
    const o = new Float32Array(a.length);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        let v = 0;
        for (let d = -r; d <= r; d++) v += g[d + r] * a[j * w + Math.min(w - 1, Math.max(0, i + d))];
        t[j * w + i] = v;
      }
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        let v = 0;
        for (let d = -r; d <= r; d++) v += g[d + r] * t[Math.min(h - 1, Math.max(0, j + d)) * w + i];
        o[j * w + i] = v;
      }
    return o;
  };

  const scale = w / 900;
  const hm = blur(hairMask, Math.max(1, Math.round(14 * scale)));
  const silh = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) silh[k] = inside[k] || hairMask[k] ? 1 : 0;
  const sm = blur(silh, Math.max(1, Math.round(6 * scale)));

  const out = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const x = X(i), y = Y(j);
      let v = shade[k] * (1 - 0.74 * hm[k]) + 0.04 * hm[k];
      // The eyes: a dark lid line and a dark iris, which is most of what says 'face'.
      const eye =
        0.62 * gauss(x, y, -0.25, 0.19, 0.105, 0.03) +
        0.62 * gauss(x, y, 0.25, 0.19, 0.105, 0.03) +
        0.5 * gauss(x, y, -0.25, 0.175, 0.048, 0.048) +
        0.5 * gauss(x, y, 0.25, 0.175, 0.048, 0.048);
      v *= 1 - Math.min(0.85, eye);
      const brow =
        0.55 * gauss(x, y, -0.25, 0.285, 0.135, 0.03) + 0.55 * gauss(x, y, 0.25, 0.285, 0.135, 0.03);
      v *= 1 - Math.min(0.7, brow);
      v *= sm[k];

      // Neck and shoulder, so it is a portrait and not a floating head.
      if (v <= 0.001 && Math.abs(x) < 0.24 && y < cyHead - 0.62) v = 0.3;
      if (v <= 0.001 && y < -0.86 && (x / 0.98) ** 2 + ((y + 1.35) / 0.55) ** 2 <= 1) v = 0.22;
      out[k] = Math.min(1, Math.max(0, v));
    }
  }
  return out;
}

// ── a real photograph ─────────────────────────────────────────────────────────

type Crop = { left: number; top: number; width: number; height: number };

/** `--matte lo0,lo1,hi0,hi1[,keepLo]` — the chroma band-pass. See `PHOTO_MATTE`. */
type Matte = { lo0: number; lo1: number; hi0: number; hi1: number; keepLo: number };
/** `--open r,a,b` — the matte opening. See `PHOTO_OPEN`. */
type Open = { r: number; a: number; b: number };
/** `--contrast pivot,k,knee` — the tone curve. See `PHOTO_CURVE`. */
type Curve = { pivot: number; k: number; knee: number };

type PhotoOpts = {
  crop: Crop | null;
  matte: Matte | null;
  open: Open | null;
  curve: Curve | null;
  unsharp: number;
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/*
 * PHOTO_MATTE — WHY A PHOTOGRAPH NEEDS A MATTE AND WHY IT IS BUILT FROM COLOUR.
 *
 * The placeholder was a head on nothing, so the silhouette was free. A photograph has a
 * room in it, and the first real one measured here is the hard case: MJK against warm
 * wooden slats, indoors. Measured on the frame, Rec.709 luminance 0-255:
 *
 *   wall, behind and beside the head   99 - 104
 *   his forehead 98 · shadow cheek 101 · jaw 102
 *
 * The wall IS the face's midtone. So a luminance floor cannot separate them — any floor
 * that kills the wall kills the shadow half of the face, which is exactly the half-a-face
 * failure this file's placeholder had to be re-lit to avoid — and cropping does not fix
 * it either, because the wall is BEHIND him, not merely around him. Rendered without a
 * matte the gate drew a rectangle of even dust with a white slab at the bottom and a
 * dark hole where the head was; the head was the least legible thing in the frame.
 *
 * What separates them is SATURATION. The varnished wood is a near-pure orange —
 * (174, 86, 18), HSV S = 0.89 — and skin at the same luminance is (152, 90, 55), S = 0.64.
 * Hue does not separate them at all (both about 25 degrees); purity does, and cleanly:
 * over the crop the saturation histogram is bimodal, the wall in a mode at 0.80-0.95 and
 * the whole head spread 0.15-0.75, with a valley at 0.72-0.80 holding 7% of pixels.
 *
 * The other end of the same axis is his white shirt, S = 0.02 at luminance 250 — 1.4x the
 * brightest thing on his face and far more area, so with the shirt in frame the sampler
 * spends more marks on his chest than on his head and the portrait is a glowing wedge.
 * A shutter cord behind him is white for the same reason.
 *
 * So it is one rule with two edges: keep the band of colour purity that skin and hair
 * occupy, drop what is more saturated than skin (the room) and what is less (the shirt).
 * `keepLo` leaves a small residual of the achromatic end rather than zero, because the
 * collar at a tenth of its weight is the dim base that stops the head from floating —
 * the same job the placeholder's own shoulder stub does at tone 0.22.
 */
function matteValue(m: Matte, R: number, G: number, B: number): number {
  const mx = Math.max(R, G, B);
  const s = mx ? (mx - Math.min(R, G, B)) / mx : 0;
  const lo = m.keepLo + (1 - m.keepLo) * smoothstep(m.lo0, m.lo1, s);
  return lo * (1 - smoothstep(m.hi0, m.hi1, s));
}

/*
 * PHOTO_OPEN — and the reason chroma alone is not enough.
 *
 * Scanning the wall strip beside his head row by row, most rows sit at S = 0.83-0.95 and
 * the matte removes them outright. A handful do not: the varnish throws specular bands a
 * few pixels tall that land at S = 0.65-0.73, INSIDE the skin band, and the cord's
 * anti-aliased edge does the same where it blends into the wood. Rendered, those survive
 * as horizontal scan-lines across the frame and a dotted scratch above his head. No
 * chroma threshold removes them without removing his shadow cheek with them.
 *
 * What separates them is not colour but SIZE: the subject is one large connected region
 * and a specular sliver is 4 pixels of it. So the matte is opened — box-blurred at radius
 * `r` and thresholded — and a pixel keeps its matte only where the matte has body around
 * it. A 3px cord in a 19px window averages 0.16 and goes; the head averages 1 and stays.
 * Outside the frame counts as zero, so the crop's own edge erodes like any other sliver
 * rather than becoming a bright rectangle border.
 *
 * It costs the silhouette about `r` pixels of feather. For a portrait that assembles out
 * of dust and disperses back into it, a soft edge is the right cost to pay.
 */
function openMatte(m: Float32Array, w: number, h: number, o: Open): void {
  const r = Math.max(0, Math.round(o.r));
  if (r < 1) return;
  const t1 = new Float32Array(w * h);
  const t2 = new Float32Array(w * h);
  const d = 2 * r + 1;
  const gx = (y: number, x: number) => (x < 0 || x >= w ? 0 : m[y * w + x]);
  const gy = (y: number, x: number) => (y < 0 || y >= h ? 0 : t1[y * w + x]);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += gx(y, x);
    for (let x = 0; x < w; x++) {
      t1[y * w + x] = acc / d;
      acc += gx(y, x + r + 1) - gx(y, x - r);
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += gy(y, x);
    for (let y = 0; y < h; y++) {
      t2[y * w + x] = acc / d;
      acc += gy(y + r + 1, x) - gy(y - r, x);
    }
  }
  for (let i = 0; i < m.length; i++) m[i] *= smoothstep(o.a, o.b, t2[i]);
}

/*
 * PHOTO_CURVE — the tone curve, and why the tone map looking right is not the test.
 *
 * The matted 72x96 grid is a good likeness to the eye, and it was still a poor DOT FIELD,
 * which are two different things. The sampler's only strong channel is density — the
 * sprite alpha ramp runs 0.28 to 0.51 and the colour ramp is near-flat above bucket 3 —
 * and density goes as (v - 0.1)^0.9. In the untouched photograph his hair sits at 0.23 to
 * 0.53 of the range and his face at 0.29 to 1.0, so hair and face drew at 1.6x of each
 * other and the head came out as one even oval. The placeholder gets its legibility from
 * hair BELOW the draw floor, drawn as absence.
 *
 * A gentle S about the midtone fixes it: it puts the dark hair and the eye sockets under
 * the floor and lifts the lit planes, and `knee` rolls the top off with a tanh so the lit
 * cheek does not clip into one white mass — the fusion failure recorded above the sprite
 * ramps. It is deliberately gentle (k = 1.35 here). Pushed to 1.9 it recreated the OTHER
 * recorded failure exactly: the shadow half of the face dropped under the floor with the
 * hair, and the frame became half a face.
 */
function toneCurve(g: Float32Array, c: Curve): void {
  for (let i = 0; i < g.length; i++) {
    let t = c.pivot + (g[i] - c.pivot) * c.k;
    if (t > c.knee) t = c.knee + (1 - c.knee) * Math.tanh((t - c.knee) / (1 - c.knee));
    g[i] = Math.min(1, Math.max(0, t));
  }
}

async function photographTone(file: string, opt: PhotoOpts): Promise<Float32Array> {
  // Imported lazily and by name so the placeholder path never needs sharp installed.
  const sharp = (await import('sharp')).default;
  let img = sharp(readFileSync(file));
  if (opt.crop) img = img.extract(opt.crop);
  // Full-resolution RGB first: the matte is a colour decision and it has to be made
  // before the downsample mixes the wall into the cheek.
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  if (info.channels < 3) throw new Error(`expected an RGB photograph, got ${info.channels} channels`);
  const n = info.width * info.height;
  const ch = info.channels;
  const lum = new Float32Array(n);
  const matte = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const R = data[i * ch], G = data[i * ch + 1], B = data[i * ch + 2];
    lum[i] = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    if (opt.matte) matte[i] = matteValue(opt.matte, R, G, B);
  }
  if (opt.open) openMatte(matte, info.width, info.height, opt.open);

  const grey = Buffer.alloc(n);
  for (let i = 0; i < n; i++) grey[i] = Math.max(0, Math.min(255, Math.round(lum[i] * matte[i])));
  const res = await sharp(grey, { raw: { width: info.width, height: info.height, channels: 1 } })
    // Explicit, and not decoration: without it sharp promotes a one-channel raw input back
    // to sRGB and `.raw()` hands back three interleaved channels. Reading that as one
    // channel scrambles the grid into stripes, which is what it looked like when it did.
    .greyscale()
    // Stretch to full range before downsampling. A tone quantiser has sixteen levels to
    // spend and a phone JPEG of a lit face rarely uses more than half the histogram.
    .normalise()
    .resize(W, H, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (res.info.channels !== 1) throw new Error(`expected 1 grey channel, got ${res.info.channels}`);
  const out = new Float32Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = res.data[i] / 255;
  if (opt.curve) toneCurve(out, opt.curve);
  return out;
}

// ── encode ────────────────────────────────────────────────────────────────────

/** Row-major, two cells a byte, high nibble first. Matches `decodeTone`. */
function encode4bpp(tone: Float32Array): string {
  const bytes = Buffer.alloc(Math.ceil(tone.length / 2));
  for (let i = 0; i < tone.length; i++) {
    const nib = Math.max(0, Math.min(15, Math.round(tone[i] * 15)));
    if (i & 1) bytes[i >> 1] |= nib;
    else bytes[i >> 1] = nib << 4;
  }
  return bytes.toString('base64');
}

/** `--flag a,b,c` or `--flag=a,b,c`, as numbers. `null` when the flag is absent. */
function numbers(args: string[], flag: string): number[] | null {
  const eq = args.find((a) => a.startsWith(`--${flag}=`));
  const raw = eq ? eq.slice(flag.length + 3) : args.includes(`--${flag}`) ? args[args.indexOf(`--${flag}`) + 1] : undefined;
  if (raw === undefined) return null;
  const out = raw.split(',').map(Number);
  if (out.some((v) => !Number.isFinite(v))) throw new Error(`--${flag} wants numbers, got "${raw}"`);
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--')) ?? null;
  const cropN = numbers(args, 'crop');
  const crop = cropN ? { left: cropN[0], top: cropN[1], width: cropN[2], height: cropN[3] } : null;
  const matteN = numbers(args, 'matte');
  const matte = matteN
    ? { lo0: matteN[0], lo1: matteN[1], hi0: matteN[2], hi1: matteN[3], keepLo: matteN[4] ?? 0 }
    : null;
  const openN = numbers(args, 'open');
  const open = openN ? { r: openN[0], a: openN[1], b: openN[2] } : null;
  const curveN = numbers(args, 'contrast');
  const curve = curveN ? { pivot: curveN[0], k: curveN[1], knee: curveN[2] } : null;
  const sharpen = numbers(args, 'unsharp')?.[0] ?? 0.7;
  const headN = numbers(args, 'head');
  // The placeholder's own box, and the default only because a photograph should pass its
  // own: the gate zooms at `head`, and aiming the zoom at the wrong place is invisible in
  // a still and obvious in motion.
  const head = headN
    ? { cx: headN[0], cy: headN[1], halfW: headN[2], halfH: headN[3] }
    : { cx: 0.5, cy: 0.435, halfW: 0.31, halfH: 0.3 };

  const tone = file
    ? await photographTone(file, { crop, matte, open, curve, unsharp: sharpen })
    : syntheticTone(W * SS, H * SS);
  const grid = unsharp(file ? tone : downsample(tone, W * SS, H * SS, W, H), W, H, file ? sharpen : 0.7);

  const lit = grid.reduce((a, b) => a + (b > 0.1 ? 1 : 0), 0) / grid.length;
  const mean = grid.reduce((a, b) => a + b, 0) / grid.length;
  const flags = [
    crop && `--crop ${cropN!.join(',')}`,
    matte && `--matte ${matteN!.join(',')}`,
    open && `--open ${openN!.join(',')}`,
    curve && `--contrast ${curveN!.join(',')}`,
    numbers(args, 'unsharp') && `--unsharp ${sharpen}`,
    headN && `--head ${headN.join(',')}`,
  ].filter(Boolean).map((f) => `\n *     ${f}`).join('');

  const body = `/**
 * The intro gate's luminance map. GENERATED — edit \`scripts/make-portrait.ts\`, not this.
 *
 *   npx tsx scripts/make-portrait.ts <photograph> [--crop l,t,w,h] [--matte …] [--open …]
 *     [--contrast pivot,k,knee] [--unsharp a] [--head cx,cy,halfW,halfH]
 *
 * ${
   file
     ? `Source: ${file} — the owner's own frame, kept outside the repository.\n * Regenerate:\n *   npx tsx scripts/make-portrait.ts ${file}${flags}`
     : 'Source: the synthetic placeholder head. NOT a likeness of anyone.'
 }
 * ${(lit * 100).toFixed(1)}% of cells are above the draw floor; mean tone ${mean.toFixed(3)}.
 *
 * \`head\` is the box the head occupies in the 0..1 unit frame, and the gate zooms into
 * its centre. It is the one value a new photograph is most likely to change.
 */
export const PORTRAIT = {
  w: ${W},
  h: ${H},
  /** True while this is the synthetic head. The gate will not claim it is anyone. */
  placeholder: ${!file},
  head: { cx: ${head.cx}, cy: ${head.cy}, halfW: ${head.halfW}, halfH: ${head.halfH} },
  /** Row-major, 4 bits a cell, high nibble first, base64. See \`decodeTone\`. */
  data:
    '${encode4bpp(grid)}',
} as const;
`;
  const out = join(process.cwd(), 'lib', 'mind', 'portrait-tone.ts');
  writeFileSync(out, body);
  process.stdout.write(
    `${out}\n  ${W}x${H} · ${Math.ceil((W * H) / 2)} B raw · ${(lit * 100).toFixed(1)}% drawn · mean ${mean.toFixed(3)}\n`,
  );
  // An ASCII proof, so a bad crop is visible without opening a browser.
  const ramp = ' .:-=+*#%@';
  for (let j = 0; j < H; j += 3) {
    let row = '  ';
    for (let i = 0; i < W; i += 1) row += ramp[Math.min(9, Math.floor(grid[j * W + i] * 10))];
    process.stdout.write(`${row}\n`);
  }
}

/**
 * A one-cell unsharp mask on the finished grid, and it is the difference between a head
 * and a face.
 *
 * At 2,600 marks the field has about 44 across the head, and the features that carry
 * identity — the eye line, the nostril, the corner of the mouth — are two or three cells
 * wide. Global contrast cannot help them: raising it blows the lit cheek before it does
 * anything to a nostril. Local contrast can, which is why every halftone process ever
 * used for faces sharpens before it screens. Amount 0.7 at a one-cell radius, which is
 * enough to separate a lid from an eyebrow and not enough to ring the silhouette.
 *
 * It applies to a real photograph too, and there it matters more: a phone JPEG of a face
 * has already been through a denoiser that ate exactly this detail.
 */
function unsharp(src: Float32Array, w: number, h: number, amount: number): Float32Array {
  const blur = new Float32Array(w * h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const y = j + dy, x = i + dx;
          if (y < 0 || y >= h || x < 0 || x >= w) continue;
          sum += src[y * w + x];
          n++;
        }
      blur[j * w + i] = sum / n;
    }
  const out = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) {
    out[k] = Math.min(1, Math.max(0, src[k] + amount * (src[k] - blur[k])));
  }
  return out;
}

function downsample(src: Float32Array, sw: number, sh: number, dw: number, dh: number) {
  const out = new Float32Array(dw * dh);
  const kx = sw / dw, ky = sh / dh;
  for (let j = 0; j < dh; j++)
    for (let i = 0; i < dw; i++) {
      let sum = 0, n = 0;
      for (let y = Math.floor(j * ky); y < Math.floor((j + 1) * ky); y++)
        for (let x = Math.floor(i * kx); x < Math.floor((i + 1) * kx); x++) {
          sum += src[y * sw + x];
          n++;
        }
      out[j * dw + i] = n ? sum / n : 0;
    }
  return out;
}

main().catch((err) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
