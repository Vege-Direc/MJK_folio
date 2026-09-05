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
  /**
   * Whether this tier draws the far background at all — `public/far-network.json`,
   * 4,664 nodes and 67 KB over the wire. The reasoning is at the mobile entry below.
   */
  farNetwork: boolean;
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
  /**
   * How fast a soma's visible brightness climbs toward the charge it just took, per second.
   *
   * Without this the climb was instant: `fireNode` wrote the saturating combine straight
   * into the attribute the shader reads, so every arrival was a step from dark to hot in
   * one frame, decaying with a 110ms half-life. A step followed by a fast fall is a flash,
   * and MJK described the result as flashing. The charge still arrives instantly - that is
   * the physiology, and `refractory` is tuned against it - but what is DRAWN now eases
   * toward it, so a firing swells and falls instead of snapping.
   *
   * It also lowers the peak without dimming anything: the drawn value chases a target that
   * is already decaying, so it never reaches it. That is a smaller bright core in the same
   * palette, rather than a global brightness cut that would take the far field with it.
   */
  exciteRise: number;
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
    farNetwork: true,
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
    exciteDecay: 3.4, exciteRise: 5.2, refractory: 0.35,
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
    /**
     * No far background on this tier. Asked as "for mobile do we need all layers or is
     * just the central enough?", and answered by counting rather than by taste.
     *
     * Two things this tier already does compound against the far field. Its fog is
     * FogExp2 at 0.030 against desktop's 0.020, which is a squared exponent, so a node
     * 50 units out survives at 10% here and 37% there. And a phone in portrait is a
     * 31-degree horizontal cone against a desktop window's 88 — a third of the angle,
     * pointed at a network that spreads laterally.
     *
     * Counting, at each of the nine stops, the far nodes that are simultaneously inside
     * the frustum and better than 10% through the fog — `THREE.Frustum` built from a
     * camera at `buildWaypoints`' own vantages, times `exp(-(d*fog)^2)`:
     *
     *   phone portrait, this tier     160 of 4,664 ever = 3.4%;  6-22 per stop
     *   tablet landscape, this tier   495 = 10.6%
     *   phone frustum, desktop fog    725 = 15.5%   (isolates the fog)
     *   desktop                     1,761 = 37.8%;  400-444 per stop
     *
     * And confirmed against the pixels, one screenshot per stop at 375 with the layer
     * on and off. Eight of the nine differ by less than one part in 255 of whole-frame
     * mean luminance — visually one or two thread-thin wisps at a frame edge. The
     * ninth, `contact`, differs by 28% (127.6 vs 92.2), because the camera ends inside
     * a far cluster there; what goes with it is a flat brightening haze over an
     * already-white frame, and the shot without it holds more depth, not less.
     *
     * What it costs to draw those few dots: 66,952 bytes, a third of the scene's whole
     * wire payload on a phone; ~7 MB of heap; and the arrival cost — before this was
     * time-sliced, a 1,506ms (4x) to 2,026ms (6x) frozen page.
     *
     * What is NOT dropped, and why the answer to "is just the central enough" is no:
     * tier 2 and the nebula stay. Turning those off was measured too, and it is a
     * different scene — the neuropil haze vanishes, the somas lose their glow and read
     * as bare balls, and the frame goes to empty black between filaments. The far
     * field's absence is a thinner version of this world; theirs is another one.
     */
    farNetwork: false,
    /**
     * Back to the desktop value, and it is the single largest thing on this tier.
     *
     * Counted on the running build by wrapping the live WebGL context: the mobile scene
     * drew 74 node billboards and 8,340 filament triangles against the desktop's 392 and
     * 175,442 in the near field alone — 19% of the somas and 4.8% of the filaments — and
     * a vision ablation that put desktop values back one at a time ranked this first by a
     * distance, at +196% on the contact stop's gradient. It called the difference "a ball
     * on a stick against a neuron", which is what a spine node with two branches instead
     * of five and a half is.
     *
     * It is affordable because of WHERE the geometry goes. Fill is area: a spine soma at
     * 3 world units covers about 517,000 device pixels of a 585x996 frame, and a
     * first-generation branch soma at 10 units covers about 23,000. Twelve more of the
     * second cost a fortieth of one of the first. The expensive kind of density is the
     * kind that is already there.
     */
    secondaryPerNode: 5.5, bloom: false, pulseCoverage: 0.8, pixelRatioCap: 1.5,
    tubeSeg: 26, tubeRad: 5, icoDetail: 1, nodeRadius: 0.5, tubeRadius: 0.06, fog: 0.030,
    bloomStrength: 0.0, bloomRadius: 0.85, bloomThreshold: 0.6, tubeCorePower: 1.6, axialFloor: 0.45,
    // No bloom on mobile => the shader carries all the glow, so keep the white-peak a
    // touch higher than desktop so nodes still read as light. Turning bloom on here is
    // a one-line experiment (bloom:true, bloomStrength:0.45) but costs five full-screen
    // passes at up to 1.5x DPR — on a mid-range Android that is 55fps against 20.
    nodeCoreWhite: 0.42, nodeBody: 0.40, nodeSizeScale: 1.6,
    pulseWidthRatio: 1.2, pulseElong: 1.15, pulseWidthEnd: 0.15, pulseOpacity: 1.0,
    pulseSpeed: 0.30, pulseGap: 0.6, pulseTailSharp: 6.0, pulsePeak: 1.35,
    exciteDecay: 3.4, exciteRise: 5.2, refractory: 0.35,
    triggerPulses: 12, triggerJitter: 1.0, triggerEarly: 0.4,
    nebulaPoints: 9000, nebulaSize: 3.0, nebulaOpacity: 0.6, nebulaSpread: 4.0,
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
