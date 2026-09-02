/**
 * The two quality tiers the scene ships in, lifted verbatim from `CFG` in the
 * prototype (`reference/preview.html:448-495`).
 *
 * Two deliberate departures from the source:
 *
 * 1. `pixelRatio` was `Math.min(window.devicePixelRatio || 1, 2)` — a `window` read at
 *    module scope, which is the one thing a module a server component may reach must
 *    never do. It is `pixelRatioCap` here and the scene multiplies it out against the
 *    device ratio it is handed.
 * 2. Tier selection was `/Mobi|Android|.../.test(navigator.userAgent) || innerWidth <= 768`,
 *    computed once. The width half meant a narrow desktop window got the mobile geometry
 *    permanently, with no way back. `detectTier` asks about the pointer and the core count
 *    instead — properties of the machine, which is what the tier is actually about.
 *
 * Every other number is the prototype's, including the ones that look arbitrary. They were
 * tuned against the running scene; a value changed here changes the look, not the code.
 */

/** WebGL-only palette. These four colours never reach the DOM. See app/globals.css. */
export const PALETTE = {
  bg: 0x0a0a0e,
  node: 0x3ecfff,
  nodeAccent: 0xff8a3d,
  tube: 0x2a8fb8,
  particle: 0xbff7ff,
} as const;

export type Tier = 'desktop' | 'mobile';

export type MindConfig = {
  secondaryPerNode: number;
  bloom: boolean;
  pulseCoverage: number;
  pixelRatioCap: number;
  tubeSeg: number;
  tubeRad: number;
  icoDetail: number;
  nodeRadius: number;
  tubeRadius: number;
  fog: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  tubeCorePower: number;
  axialFloor: number;
  nodeCoreWhite: number;
  nodeBody: number;
  nodeSizeScale: number;
  pulseWidthRatio: number;
  pulseElong: number;
  pulseWidthEnd: number;
  pulseOpacity: number;
  pulseSpeed: number;
  pulseGap: number;
  pulseTailSharp: number;
  pulsePeak: number;
  exciteDecay: number;
  refractory: number;
  triggerPulses: number;
  triggerJitter: number;
  triggerEarly: number;
  nebulaPoints: number;
  nebulaSize: number;
  nebulaOpacity: number;
  nebulaSpread: number;
  nebulaDrift: number;
  nebulaMouse: number;
  nebulaMouseRadius: number;
  subBranchDepth: number;
  subBranchProb: number;
  subLenDecay: number;
  subMaxNodes: number;
  subPulseFrac: number;
  swayAmt: number;
  swayFreq: number;
  t2Seeds: number;
  t2RadMin: number;
  t2RadMax: number;
  t2MaxNodes: number;
  t3SegScale: number;
  t3Radial: number;
  t3TubeRadius: number;
  t3TrunkRadius: number;
  t3NodeScale: number;
  t3PulseCount: number;
  t3EdgeFrac: number;
  t3AxialFloor: number;
  t3Bright: number;
  t3Dust: number;
  t3DustSize: number;
  t3DustSpread: number;
  t3Accent: number;
  corridorInner: number;
  corridorOuter: number;
};

export const CFG: Record<Tier, MindConfig> = {
  desktop: {
    secondaryPerNode: 5.5, bloom: true, pulseCoverage: 1.0, pixelRatioCap: 2,
    tubeSeg: 64, tubeRad: 12, icoDetail: 3, nodeRadius: 0.5, tubeRadius: 0.045, fog: 0.020,
    bloomStrength: 0.45, bloomRadius: 0.85, bloomThreshold: 0.6, tubeCorePower: 2.0, axialFloor: 0.4,
    // Node luminance tuned for eye comfort: lower white-peak + smaller glow
    // radius + softer bloom reduce the high-luminance-on-near-black contrast
    // that fatigues eyes. Glow radius is a VISUAL metaphor, not medical
    // (neurons emit no light) — sized for calm.
    nodeCoreWhite: 0.32, nodeBody: 0.32, nodeSizeScale: 1.7,
    pulseWidthRatio: 1.2, pulseElong: 1.15, pulseWidthEnd: 0.15, pulseOpacity: 1.0,
    pulseSpeed: 0.36, pulseGap: 0.5, pulseTailSharp: 6.0, pulsePeak: 1.35,
    exciteDecay: 6.3, refractory: 0.35,
    triggerPulses: 20, triggerJitter: 1.2, triggerEarly: 0.5,
    nebulaPoints: 9000, nebulaSize: 3.2, nebulaOpacity: 0.5, nebulaSpread: 5.0,
    nebulaDrift: 0.4, nebulaMouse: 10, nebulaMouseRadius: 7,
    subBranchDepth: 3, subBranchProb: 0.80, subLenDecay: 0.66, subMaxNodes: 720, subPulseFrac: 0.30,
    swayAmt: 0.5, swayFreq: 0.45,
    // Tier 2 (midground): growth-front seeds scattered just outside the soft camera
    // corridor, grown with the SAME Galton-Watson logic + cfg values as the main
    // sub-network (ambient-only: sway + shimmer + the same fractional pulse coverage).
    t2Seeds: 26, t2RadMin: 9, t2RadMax: 16, t2MaxNodes: 700,
    // Tier 3 (far background): precomputed space colonization (public/far-network.json).
    // Rendered through the SAME makeCurve / tubeWithTangent / tubeMat / nodeMat as
    // tiers 1-2 — only the topology differs.
    t3SegScale: 0.4, t3Radial: 5, t3TubeRadius: 0.035, t3TrunkRadius: 0.11, t3NodeScale: 0.5,
    t3PulseCount: 800, t3EdgeFrac: 1.0, t3AxialFloor: 0.62, t3Bright: 1.5,
    t3Dust: 8000, t3DustSize: 2.6, t3DustSpread: 3.4, t3Accent: 0.24,
    // soft corridor for tier-2 seeding: density *= smoothstep(inner, outer, distToPath)
    corridorInner: 9, corridorOuter: 16,
  },
  mobile: {
    secondaryPerNode: 2.0, bloom: false, pulseCoverage: 0.8, pixelRatioCap: 1.5,
    tubeSeg: 26, tubeRad: 5, icoDetail: 1, nodeRadius: 0.5, tubeRadius: 0.06, fog: 0.030,
    bloomStrength: 0.0, bloomRadius: 0.85, bloomThreshold: 0.6, tubeCorePower: 1.6, axialFloor: 0.45,
    // No bloom on mobile => the shader carries all the glow, so keep the white-peak a
    // touch higher than desktop so nodes still read as light. Turning bloom on here is
    // a one-line experiment (bloom:true, bloomStrength:0.45) but costs five full-screen
    // passes at up to 1.5x DPR — on a mid-range Android that is 55fps against 20.
    nodeCoreWhite: 0.42, nodeBody: 0.40, nodeSizeScale: 1.6,
    pulseWidthRatio: 1.2, pulseElong: 1.15, pulseWidthEnd: 0.15, pulseOpacity: 1.0,
    pulseSpeed: 0.30, pulseGap: 0.6, pulseTailSharp: 6.0, pulsePeak: 1.35,
    exciteDecay: 6.3, refractory: 0.35,
    triggerPulses: 12, triggerJitter: 1.0, triggerEarly: 0.4,
    nebulaPoints: 2700, nebulaSize: 3.0, nebulaOpacity: 0.6, nebulaSpread: 4.0,
    nebulaDrift: 0.2, nebulaMouse: 7, nebulaMouseRadius: 6,
    subBranchDepth: 2, subBranchProb: 0.72, subLenDecay: 0.7, subMaxNodes: 200, subPulseFrac: 0.28,
    swayAmt: 0.35, swayFreq: 0.4,
    t2Seeds: 10, t2RadMin: 8, t2RadMax: 14, t2MaxNodes: 220,
    t3SegScale: 0.4, t3Radial: 4, t3TubeRadius: 0.035, t3TrunkRadius: 0.1, t3NodeScale: 0.46,
    t3PulseCount: 240, t3EdgeFrac: 0.55, t3AxialFloor: 0.62, t3Bright: 1.5,
    t3Dust: 2600, t3DustSize: 2.4, t3DustSpread: 3.2, t3Accent: 0.24,
    corridorInner: 8, corridorOuter: 14,
  },
};

/**
 * Which tier this machine gets.
 *
 * A coarse pointer means a phone or a tablet. Four cores or fewer means a machine that
 * will not carry 9,000 nebula points and five bloom passes whatever it is pointed with.
 * Viewport width is deliberately NOT consulted: the geometry cannot be rebuilt on
 * resize, so a decision made from a resizable number is a decision that goes stale.
 */
export function detectTier(view: Window | null | undefined): Tier {
  if (!view) return 'desktop';
  const coarse = view.matchMedia?.('(pointer: coarse)').matches ?? false;
  const cores = view.navigator?.hardwareConcurrency ?? 8;
  return coarse || cores <= 4 ? 'mobile' : 'desktop';
}
