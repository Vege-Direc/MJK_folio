import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

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
 * of degree. This runs INSIDE the render pipeline, after the bloom and before the output
 * pass, so it changes the light the filaments are rendered with rather than putting
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
 */
export const READING_LIGHT_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    /** 0 = text on the left, 1 = text on the right, 0.5 = full width (one column). */
    uAnchor: { value: 0 },
    /** How far across the frame the falloff reaches. Wide on purpose. */
    uSpan: { value: 0.78 },
    /** Peak attenuation of a bright pixel directly behind the text. */
    uAmount: { value: 0 },
    /**
     * What fraction of the peak still applies at the far side of the frame.
     *
     * Not zero, because both columns carry prose: the media column holds card bodies and
     * the timeline's summaries, and on a right-aligned stop that column is the side the
     * ramp is pointing away from. A floor keeps those words defended while leaving the
     * light clearly weighted -- nearly three times stronger -- toward the text column.
     */
    uFloor: { value: 0.58 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAnchor;
    uniform float uSpan;
    uniform float uAmount;
    uniform float uFloor;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Distance from the side the words are on: 0 under the text, 1 at the far edge.
      float x = abs(vUv.x - uAnchor);
      float fall = smoothstep(0.0, uSpan, x);

      // Only the bright things come down. Near-black is left where it was, so the void
      // never reads as a dimmed region.
      float lum = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
      float hi = smoothstep(0.06, 0.55, lum);

      float k = uAmount * mix(1.0, uFloor, fall) * hi;
      gl_FragColor = vec4(texel.rgb * (1.0 - k), texel.a);
    }
  `,
};

export function makeReadingLightPass(): ShaderPass {
  return new ShaderPass(READING_LIGHT_SHADER);
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
