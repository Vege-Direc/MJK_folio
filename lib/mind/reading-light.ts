import * as THREE from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * The reading light: a full-screen pass that takes the top off the scene's brightest
 * pixels on whichever side the current stop puts its text.
 *
 * This is the escalation DESIGN.md commits to, and it exists because the per-glyph halo
 * has a ceiling. A halo defends a stroke against its immediate surround; it can do
 * nothing about a bright node parked directly behind a paragraph, because then the
 * background is bright everywhere the eye looks and not merely between the letters.
 * Measured, that is exactly where it failed — `now`, `contact` and `apac`, where the
 * camera path happens to sit a cluster behind the text column.
 *
 * Two attempts already failed by covering the scene, and the difference here is not one
 * of degree. This runs INSIDE the render pipeline, on linear values before the output
 * transform, so it changes the light the filaments are rendered with rather than putting
 * something in front of them. There is nothing to have an edge, nothing to smear and
 * nothing to composite — which is what makes it read as lighting rather than as a plate.
 *
 * Two properties keep it honest:
 *
 * 1. **It only attenuates what is already bright.** The `hi` term is a smoothstep on
 *    luminance, so near-black stays near-black and only the nodes, the filament cores
 *    and the bloom halo come down. A flat multiply would darken the void as well, and
 *    darkening the void is how you get a region that looks dimmed instead of a scene
 *    that looks further away.
 * 2. **It never steps.** The falloff is a smoothstep across most of the frame's width,
 *    so there is no boundary anywhere for the eye to find, and the far side of the frame
 *    is untouched.
 *
 * The controls, and the handful of lines of GLSL that are the whole effect:
 *
 * `uAnchor` — 0 = text on the left, 1 = text on the right, 0.5 = full width (one column).
 * `uSpan`   — how far across the frame the falloff reaches. Wide on purpose.
 * `uAmount` — peak attenuation of a bright pixel directly behind the text.
 * `uFloor`  — what fraction of the peak still applies at the far side of the frame. Not
 *   zero, because both columns carry prose: the media column holds card bodies and the
 *   timeline's summaries, and on a right-aligned stop that column is the side the ramp is
 *   pointing away from. A floor keeps those words defended while leaving the light
 *   clearly weighted -- nearly three times stronger -- toward the text column.
 *
 * `READING_LIGHT_ATTENUATE` expects a `vec4 c` in scope holding the LINEAR texel, and
 * leaves the attenuated value in it.
 */
const READING_LIGHT_UNIFORMS = /* glsl */ `
  uniform float uAnchor;
  uniform float uSpan;
  uniform float uAmount;
  uniform float uFloor;
`;

const READING_LIGHT_ATTENUATE = /* glsl */ `
  {
    float x = abs(vUv.x - uAnchor);
    float fall = smoothstep(0.0, uSpan, x);
    float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    float hi = smoothstep(0.06, 0.55, lum);
    float k = uAmount * mix(1.0, uFloor, fall) * hi;
    c.rgb *= (1.0 - k);
  }
`;

/** The uniform block a caller drives, on either shape of pass. */
export type ReadingLightUniforms = {
  uAnchor: { value: number };
  uSpan: { value: number };
  uAmount: { value: number };
  uFloor: { value: number };
};

/**
 * The light, folded into the output pass instead of standing in front of it.
 *
 * It shipped first as its own `ShaderPass` sitting between the bloom and the output, and
 * that is one extra full-screen read of the whole frame plus one extra full-screen write,
 * every frame. On a desktop GPU that is unmeasurable — at 4x and 6x CPU throttling,
 * removing the pass entirely moved the frame-time distribution by nothing at all (p95
 * 100.0ms with, 98.4ms without) — but a phone GPU is bandwidth-bound long before it is
 * ALU-bound, and at 1.5x device pixel ratio on a 375x812 viewport that is 562x1218 pixels
 * read and written for nothing.
 *
 * The attenuation is arithmetic on a texel the output pass is already holding, so doing
 * it there is free: same maths, same linear space, one fewer round trip through memory.
 * `OutputPass` still owns the tone-mapping and colour-space defines, which it rebuilds
 * from the renderer at render time — so this keeps working if either ever changes.
 */
export class ReadingLightOutputPass extends OutputPass {
  readonly light: ReadingLightUniforms;

  constructor() {
    super();
    const u = this.uniforms as unknown as Record<string, { value: number }>;
    u.uAnchor = { value: 0 };
    u.uSpan = { value: 0.78 };
    u.uAmount = { value: 0 };
    u.uFloor = { value: 0.58 };
    this.light = this.uniforms as unknown as ReadingLightUniforms;

    const mat = this.material as THREE.RawShaderMaterial;
    mat.fragmentShader = mat.fragmentShader
      .replace('uniform sampler2D tDiffuse;', `uniform sampler2D tDiffuse;\n${READING_LIGHT_UNIFORMS}`)
      // Before tone mapping and before the sRGB transfer, so the light works on the same
      // linear values a pass of its own would have seen.
      .replace(
        'gl_FragColor = texture2D( tDiffuse, vUv );',
        `vec4 c = texture2D( tDiffuse, vUv );\n${READING_LIGHT_ATTENUATE}\n\t\t\tgl_FragColor = c;`
      );
    mat.needsUpdate = true;
  }
}

/**
 * The side the text sits on at scroll position `u`, eased between stops.
 *
 * Stepping this at a stop boundary would swing the light across the frame in a single
 * frame, which is the one way a lighting effect announces itself. Smoothstepping the
 * blend means the light drifts across while the camera is between two stops, and has
 * arrived by the time the reader has.
 */
export function anchorAt(u: number, sides: readonly number[]): number {
  const n = sides.length;
  if (n === 0) return 0.5;
  if (n === 1) return sides[0] > 0 ? 1 : 0;
  const f = Math.min(Math.max(u, 0), 1) * (n - 1);
  const i0 = Math.min(Math.floor(f), n - 1);
  const i1 = Math.min(i0 + 1, n - 1);
  const frac = f - i0;
  const w = frac * frac * (3 - 2 * frac);
  const side = sides[i0] * (1 - w) + sides[i1] * w;
  // -1..1 -> 0..1, the anchor the shader wants.
  return (side + 1) / 2;
}
