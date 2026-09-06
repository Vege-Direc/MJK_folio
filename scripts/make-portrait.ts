/**
 * Build `lib/mind/portrait-tone.ts` — the luminance map the intro gate quantises into
 * dots. One command, one generated file, and it is the ONLY thing that has to change when
 * a real photograph arrives.
 *
 *   npx tsx scripts/make-portrait.ts                       # regenerate the placeholder
 *   npx tsx scripts/make-portrait.ts path/to/portrait.jpg  # use a real photograph
 *   npx tsx scripts/make-portrait.ts p.jpg --crop 120,340,520,700
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

async function photographTone(file: string, crop: Crop | null): Promise<Float32Array> {
  // Imported lazily and by name so the placeholder path never needs sharp installed.
  const sharp = (await import('sharp')).default;
  let img = sharp(readFileSync(file));
  if (crop) img = img.extract(crop);
  const { data } = await img
    .greyscale()
    // Stretch to full range before downsampling. A tone quantiser has sixteen levels to
    // spend and a phone JPEG of a lit face rarely uses more than half the histogram.
    .normalise()
    .resize(W, H, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = new Float32Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i] / 255;
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

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--')) ?? null;
  const cropArg = args.find((a) => a.startsWith('--crop='))?.slice(7) ??
    (args.includes('--crop') ? args[args.indexOf('--crop') + 1] : undefined);
  const crop = cropArg
    ? (() => {
        const [left, top, width, height] = cropArg.split(',').map(Number);
        return { left, top, width, height };
      })()
    : null;

  const tone = file ? await photographTone(file, crop) : syntheticTone(W * SS, H * SS);
  const grid = unsharp(file ? tone : downsample(tone, W * SS, H * SS, W, H), W, H, 0.7);

  const lit = grid.reduce((a, b) => a + (b > 0.1 ? 1 : 0), 0) / grid.length;
  const mean = grid.reduce((a, b) => a + b, 0) / grid.length;

  const body = `/**
 * The intro gate's luminance map. GENERATED — edit \`scripts/make-portrait.ts\`, not this.
 *
 *   npx tsx scripts/make-portrait.ts <photograph> [--crop left,top,w,h]
 *
 * ${
   file
     ? `Source: ${file}${crop ? ` cropped ${crop.left},${crop.top} ${crop.width}x${crop.height}` : ''}`
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
  head: { cx: 0.5, cy: 0.435, halfW: 0.31, halfH: 0.3 },
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
