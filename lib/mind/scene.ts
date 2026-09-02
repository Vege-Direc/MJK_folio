/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * The mind. Vanilla three.js, no React, no GSAP, no page.
 *
 * Transcribed from `createNeuralScroll` in `reference/preview.html:507-2126`. The geometry,
 * the shaders and every tuned constant are the prototype's, unchanged. What changed is the
 * module's relationship with the document, and all of it in one direction:
 *
 *   - It never reads scroll and it never writes scroll. `setProgress` is pushed in. The
 *     prototype's `syncScroll` (`:1743`) did `window.scrollTo(0, u * max)` at the end of
 *     every camera flight — a jump of up to eight viewport heights in one frame, after
 *     1.6 seconds during which `ScrollTrigger.onUpdate` had discarded the reader's wheel
 *     entirely (`:1726`). Both halves of that are gone, structurally: there is no code
 *     path from here to the scroll position.
 *   - It touches no element it was not handed. `#fps`, `#node-label`, `#tier-label`,
 *     `#webgl-fallback` and `#scroll-hint` are callbacks now, or the caller's problem.
 *     The one DOM object it reaches for is `canvas.ownerDocument` — for the pointer
 *     listeners and the animation frame — which is the canvas it was given, not a global.
 *   - GSAP is gone. `flyTo` is a thirty-line ease over `displayProgress`.
 *   - `prefers-reduced-motion` is live (`setReducedMotion`), not read once at module load.
 *   - The render loop stops: `setPaused` for a hidden tab, `webglcontextlost` for a GPU
 *     that gave up. The prototype had neither, so a lost context left a black page forever.
 *
 * The far network (tier 3, 4,664 nodes) is fetched non-blocking. Tiers 1 and 2 are the
 * scene; tier 3 is depth behind it, and its absence is silent on purpose.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { CFG, PALETTE, detectTier, type Tier } from './config';
import { clamp, makeCurve, smoothstep, tubeWithTangent, UP } from './curves';
import { buildWaypoints, mulberry32, srand, type Waypoint } from './waypoints';

export type MindOptions = {
  /** Nine by default — one per stop in content/stops.ts. */
  waypoints?: Waypoint[];
  /** Live: pass the current value and call `setReducedMotion` when it changes. */
  reducedMotion?: boolean;
  /** Pin the quality tier. Omitted, it is detected once from the machine. */
  tier?: Tier;
  /** Tier 3 topology. Fetched after the scene is already running. */
  farNetworkUrl?: string;
  onArriveAtStop?: (stopIndex: number) => void;
  /** Replaces the prototype's per-500ms write to `#fps`. */
  onFps?: (fps: number) => void;
  /** WebGL unavailable, or the context was lost. The caller shows the fallback. */
  onContextLost?: (reason: 'unsupported' | 'lost') => void;
};

export type MindHandle = {
  /** 0..1 document scroll. Push-only; the module never reads or writes scroll. */
  setProgress(t: number): void;
  /** Flies the camera only. Resolves when it lands, or when a reader overrides it. */
  flyTo(stopIndex: number, seconds?: number): Promise<void>;
  /** Fire a signal from a stop's node. Defaults to the stop the camera is at. */
  pulse(stopIndex?: number): void;
  setReducedMotion(on: boolean): void;
  resize(w: number, h: number): void;
  setPaused(paused: boolean): void;
  getProgress(): number;
  getStop(): number;
  stopCount(): number;
  /** Idempotent — React 19 strict mode double-invokes the effect that calls it. */
  dispose(): void;
};

type Flight = { from: number; to: number; t: number; duration: number; resolve: () => void };

/**
 * The pulse sprite: white, radial, transparent at the rim.
 *
 * The prototype painted this into a 2D canvas (`:1443-1454`). Computing the same ramp
 * directly is one fewer reason for this module to know what a document is, and the four
 * gradient stops are reproduced exactly.
 */
function makePulseTexture(): THREE.DataTexture {
  const size = 128;
  const half = size / 2;
  const stops: [number, number][] = [
    [0.0, 1.0],
    [0.25, 0.85],
    [0.55, 0.3],
    [1.0, 0.0],
  ];
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - half;
      const dy = y + 0.5 - half;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) / half);
      let a = 0;
      for (let i = 1; i < stops.length; i++) {
        const [r0, a0] = stops[i - 1];
        const [r1, a1] = stops[i];
        if (r <= r1) {
          a = a0 + (a1 - a0) * ((r - r0) / (r1 - r0));
          break;
        }
      }
      const k = (y * size + x) * 4;
      data[k] = 255;
      data[k + 1] = 255;
      data[k + 2] = 255;
      data[k + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** A handle that does nothing, for when there is no WebGL to drive. */
function inertHandle(stops: number): MindHandle {
  return {
    setProgress() {},
    flyTo: () => Promise.resolve(),
    pulse() {},
    setReducedMotion() {},
    resize() {},
    setPaused() {},
    getProgress: () => 0,
    getStop: () => 0,
    stopCount: () => stops,
    dispose() {},
  };
}

export function createMind(canvas: HTMLCanvasElement, opts: MindOptions = {}): MindHandle {
  const doc = canvas.ownerDocument;
  const maybeView = doc.defaultView;
  const waypoints = opts.waypoints ?? buildWaypoints(9);
  const M = waypoints.length;
  if (!maybeView) return inertHandle(M);
  // A const with a non-nullable annotation: TS keeps narrowing out of hoisted function
  // declarations, and animate()/dispose() are both hoisted.
  const view: Window = maybeView;

  const tier: Tier = opts.tier ?? detectTier(view);
  const cfg = CFG[tier];
  const isMobile = tier === 'mobile';
  const farNetworkUrl = opts.farNetworkUrl ?? '/far-network.json';
  const onArriveAtNodeCb = opts.onArriveAtStop ?? null;
  const onFps = opts.onFps ?? null;

  let reduced = opts.reducedMotion ?? view.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let viewW = Math.max(1, canvas.clientWidth || view.innerWidth);
  let viewH = Math.max(1, canvas.clientHeight || view.innerHeight);

  let scrollProgress = 0;
  let displayProgress = 0;
  let currentStop = -1;
  let flight: Flight | null = null;
  let paused = false;
  let disposed = false;

  if (M < 2) console.warn('[mind] need >=2 waypoints');

  // Probe with attributes matching WebGLRenderer so the reused context keeps
  // alpha:false + the antialias setting. preserveDrawingBuffer keeps the last frame
  // readable for canvas capture (screenshots/thumbnails); one buffer copy, negligible.
  const ctxAttrs = {
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance' as const,
    preserveDrawingBuffer: true,
  };
  const testCtx = canvas.getContext('webgl2', ctxAttrs) ?? canvas.getContext('webgl', ctxAttrs);
  if (!testCtx) {
    opts.onContextLost?.('unsupported');
    return inertHandle(M);
  }


    const rng = mulberry32(0x5eed ^ M);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(view.devicePixelRatio || 1, cfg.pixelRatioCap));
    renderer.setSize(viewW, viewH, false);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(PALETTE.bg, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.bg);
    scene.fog = new THREE.FogExp2(PALETTE.bg, cfg.fog);

    const camera = new THREE.PerspectiveCamera(62, viewW / viewH, 0.1, 600);

    // spine nodes (featured) = waypoint.lookAt ; camera vantages = waypoint.position
    const S = waypoints.map(w => new THREE.Vector3().fromArray(w.lookAt));
    const V = waypoints.map(w => new THREE.Vector3().fromArray(w.position));

    // --- secondary nodes (ambient density, branch off interior spine nodes) ---
    const secondary = [];
    const secondaryParent = [];
    const secondaryCount = Math.max(0, Math.round((M - 1) * cfg.secondaryPerNode));
    for (let i = 0; i < secondaryCount; i++){
      const parent = 1 + Math.floor(rng() * Math.max(1, M - 1));
      const p = S[parent].clone();
      const dir = S[Math.min(parent + 1, M - 1)].clone().sub(S[parent]);
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
      dir.normalize();
      let perp = new THREE.Vector3().crossVectors(dir, UP);
      if (perp.lengthSq() < 1e-4) perp = new THREE.Vector3(1, 0, 0);
      perp.normalize();
      const up2 = new THREE.Vector3().crossVectors(dir, perp).normalize();
      const ang = rng() * Math.PI * 2;
      const r = 2.2 + rng() * 4.5;
      p.addScaledVector(perp, Math.cos(ang) * r).addScaledVector(up2, Math.sin(ang) * r);
      secondary.push(p);
      secondaryParent.push(parent);
    }

    // --- recursive dendritic sub-network (Galton-Watson binary branching) ---
    // Medical grounding (Vormberg et al., PLOS Comp Biol 2017): real dendrites are
    // predominantly BINARY trees, statistically indistinguishable from a Galton-
    // Watson random branching process (bifurcation ratio ~3.4-4), with segment
    // length DECAY by branch order and MST/optimal-wiring spatial growth. So we
    // grow a stochastic binary tree from each secondary node (the existing depth-1
    // layer): at each tip, branch (mostly into 2) with probability subBranchProb
    // until max depth; children step outward in a cone around the parent direction
    // with length decaying by depth (Rall-like). Spine + secondary are untouched.
    // These sub-nodes/filaments are AMBIENT (no camera stops) — they extend the
    // network into a true neural mesh. Sway params (phase, amplitude) are assigned
    // per node by depth so the wind-sway shader can bend filaments root->tip with
    // endpoints that EXACTLY match node centers (no detachment): each tube vertex
    // bakes a phase = lerp(rootNodePhase, tipNodePhase, u) and the node billboard
    // uses its own phase, so a tube endpoint and its node share the same phase =>
    // identical displacement. Direction is derived in-shader from the phase
    // (deterministic) so every node/vertex sways in a unique direction with no
    // extra attribute, and endpoints still match (same phase => same direction).
    const depthAmp = [0, 0.12, 0.28, 0.42, 0.52, 0.58, 0.6]; // sway amplitude by depth (0 spine => fixed)
    const nodeSway = [];      // per-node [phase, amp], indexed 0..totalNodes-1
    const nodeDepthArr = [];  // per-node branch order
    for (let i = 0; i < M; i++){ nodeSway.push([srand(i * 12.9 + 1.1) * Math.PI * 2, 0]); nodeDepthArr.push(0); }
    for (let s = 0; s < secondary.length; s++){
      nodeSway.push([srand((M + s) * 12.9 + 1.1) * Math.PI * 2, depthAmp[1]]); nodeDepthArr.push(1);
    }
    const subNodes = [];    // {pos, depth, parentIdx, origin}
    const subCurves = [];   // {curve, originIdx, rootIdx, tipIdx, depth, t2}
    // Shared Galton-Watson growth — used by BOTH tier 1's sub-network and tier 2's
    // midground (same logic, same cfg values; only the SEEDING differs).
    let nodeCursor = M + secondary.length; // global index of the next sub-node
    function growGW(fronts: any[], nodeCap: number, t2: boolean){
      const maxD = cfg.subBranchDepth, baseLen = 2.6;
      let guard = 0;
      while (fronts.length && guard < 6000 && subNodes.length < nodeCap){
        guard++;
        const f = fronts.shift();
        if (f.depth >= maxD) continue;
        if (rng() > cfg.subBranchProb) continue;             // Galton-Watson: terminate this tip
        const nChild = (rng() < 0.7) ? 2 : (rng() < 0.5 ? 1 : 3); // mostly binary (PLOS: predominantly binary)
        const len = baseLen * Math.pow(cfg.subLenDecay, f.depth) * (0.7 + rng() * 0.6);
        for (let c = 0; c < nChild; c++){
          const spread = (0.5 + rng() * 0.9) * (0.6 + f.depth * 0.15);
          let perp = new THREE.Vector3().crossVectors(f.dir, UP);
          if (perp.lengthSq() < 1e-4) perp = new THREE.Vector3(1, 0, 0);
          perp.normalize();
          const up2 = new THREE.Vector3().crossVectors(f.dir, perp).normalize();
          const a = rng() * Math.PI * 2, tilt = rng() * spread;
          const dir = f.dir.clone().applyAxisAngle(perp, Math.sin(a) * tilt).applyAxisAngle(up2, Math.cos(a) * tilt).normalize();
          const childPos = f.pos.clone().addScaledVector(dir, len);
          const childIdx = nodeCursor++, childDepth = f.depth + 1;
          subNodes.push({ pos: childPos, depth: childDepth, parentIdx: f.parentIdx, origin: f.origin });
          nodeSway.push([srand(childIdx * 12.9 + 1.1) * Math.PI * 2, depthAmp[Math.min(childDepth, depthAmp.length - 1)]]);
          nodeDepthArr.push(childDepth);
          subCurves.push({ curve: makeCurve(f.pos, childPos, 5000 + subCurves.length), originIdx: f.origin, rootIdx: f.parentIdx, tipIdx: childIdx, depth: childDepth, t2 });
          fronts.push({ pos: childPos, dir, depth: childDepth, parentIdx: childIdx, origin: f.origin });
        }
      }
    }
    // Tier 1: seed growth fronts from each secondary node (depth 1) so the
    // recursion continues the hierarchy spine(0) -> secondary(1) -> sub(2) -> ...
    // (unchanged behavior + rng order => identical output to before).
    {
      const fronts = [];
      for (let s = 0; s < secondary.length; s++){
        const p = S[secondaryParent[s]];
        const d = secondary[s].clone().sub(p); if (d.lengthSq() < 1e-4) d.set(0, 0, -1); d.normalize();
        fronts.push({ pos: secondary[s].clone(), dir: d, depth: 1, parentIdx: M + s, origin: secondaryParent[s] });
      }
      growGW(fronts, cfg.subMaxNodes, false);
    }
    // --- Tier 2 (midground): SAME growth logic, seeded from points scattered just
    // outside the camera corridor with a SOFT smoothstep falloff (never a hard
    // cut), at radii where tier 1's own sub-network already reaches — so tier 2
    // reads as a continuation of tier 1's density, not a seam. Nodes/curves are
    // appended to the same arrays => same tube builder, node billboards, nebula
    // sampling, and fractional ambient-pulse pool as tier 1's twigs.
    const distToSpine = (p: THREE.Vector3): number => {
      let best = Infinity;
      const ab = new THREE.Vector3(), ap = new THREE.Vector3(), q = new THREE.Vector3();
      for (let i = 0; i < M - 1; i++){
        ab.subVectors(S[i + 1], S[i]); ap.subVectors(p, S[i]);
        const t = clamp(ap.dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1);
        q.copy(S[i]).addScaledVector(ab, t);
        best = Math.min(best, p.distanceTo(q));
      }
      return best;
    };
    {
      const fronts = [];
      let attempts = 0;
      while (fronts.length < cfg.t2Seeds && attempts < cfg.t2Seeds * 60){
        attempts++;
        const segI = Math.floor(rng() * Math.max(1, M - 1));
        const base = S[segI].clone().lerp(S[Math.min(segI + 1, M - 1)], rng());
        const ang = rng() * Math.PI * 2, elev = (rng() - 0.5) * 1.6;
        const dir = new THREE.Vector3(Math.cos(ang) * Math.cos(elev), Math.sin(elev), Math.sin(ang) * Math.cos(elev)).normalize();
        const p = base.addScaledVector(dir, cfg.t2RadMin + rng() * (cfg.t2RadMax - cfg.t2RadMin));
        // soft corridor: acceptance ramps 0 -> 1 across [inner, outer] => density
        // TAPERS toward the camera path instead of cutting off geometrically.
        if (rng() > smoothstep(cfg.corridorInner, cfg.corridorOuter, distToSpine(p))) continue;
        let origin = 0, bd = Infinity;
        for (let i = 0; i < M; i++){ const dd = p.distanceToSquared(S[i]); if (dd < bd){ bd = dd; origin = i; } }
        const gi = nodeCursor++;
        subNodes.push({ pos: p.clone(), depth: 1, parentIdx: origin, origin });
        nodeSway.push([srand(gi * 12.9 + 1.1) * Math.PI * 2, depthAmp[1]]);
        nodeDepthArr.push(1);
        // Connector filament from the nearest spine node OUT to this seed, so the
        // midground cluster reads as a BRANCH off the main trunk (tip -> branch ->
        // trunk -> soma) rather than a tuft floating disconnected in space. Built
        // with the same makeCurve + fed into the same tube/nebula/pulse machinery.
        subCurves.push({ curve: makeCurve(S[origin], p, 8000 + gi), originIdx: origin, rootIdx: origin, tipIdx: gi, depth: 1, t2: true });
        fronts.push({ pos: p.clone(), dir, depth: 1, parentIdx: gi, origin });
      }
      growGW(fronts, cfg.subMaxNodes + cfg.t2MaxNodes, true);
    }

    const totalNodes = M + secondary.length + subNodes.length;

    // --- node instanced mesh ---
    // Nodes = camera-facing glow quads (billboards) with a procedural radial gradient.
    // This kills silhouette faceting ENTIRELY: the disk is always a perfectly round glow
    // regardless of tessellation (no polygon outline to catch the eye under controlled bloom).
    // Matches the hazy/nebula reference; 1 draw call via InstancedMesh; cheaper than lit spheres.
    // AdditiveBlending + transparent + depthWrite:false is the canonical glow technique
    // (Stemkoski "Shader-Glow" + SO additive-sprite). Per-instance color + size preserved.
    // ShaderMaterial auto-injects instanceMatrix / instanceColor for InstancedMesh.
    const nodeGeo = new THREE.PlaneGeometry(1, 1);
    const nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        uSizeScale:  { value: cfg.nodeSizeScale },   // world-space glow radius = 0.5 * instanceScale * uSizeScale (visual metaphor, sized for calm)
        uCorePower:  { value: 2.5 },   // tight hot core
        uHaloPower:  { value: 1.2 },   // broad soft halo -> alpha driver, smooth falloff to 0 at the disk edge
        uCoreWhite:  { value: cfg.nodeCoreWhite },  // white-peak lowered for eye comfort; excitation still pushes toward white on fire
        uBody:       { value: cfg.nodeBody },   // colored body brightness (dimmed baseline)
        uFogDensity: { value: cfg.fog },
        uSwayTime:   { value: 0 },
        uSwayAmt:    { value: reduced ? 0 : cfg.swayAmt },
        uSwayFreq:   { value: cfg.swayFreq },
        uTime:       { value: 0 },
        uBreathAmt:  { value: reduced ? 0 : 0.06 }, // soft scale breathing amplitude
        uExciteAmt:  { value: 0.8 }, // how much arrival/departure excitation brightens+scales a node
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vViewDist;
        varying float vExcite;
        uniform float uSizeScale;
        attribute float aSwayPhase;
        attribute float aSwayAmp;
        attribute float aBreathPhase;
        attribute float aBreathFreq;
        attribute float aExcite;
        uniform float uSwayTime, uSwayAmt, uSwayFreq, uTime, uBreathAmt, uExciteAmt;
        // Sway direction derived deterministically from the phase so every node
        // sways in a unique direction with no extra attribute. A node and the
        // filament endpoint sharing the same phase => same direction => the
        // billboard never detaches from the wire tip. amp 0 (spine) => no sway.
        vec3 swayDir(float ph){
          return normalize(vec3(sin(ph * 2.1) + 0.30, cos(ph * 1.7) + 0.20, sin(ph * 3.3) + 0.40));
        }
        void main(){
          vColor = instanceColor;
          vExcite = aExcite; // per-instance excitation (set by the pulse system each frame)
          // instance translation (world center of this node) + uniform scale from instanceMatrix
          vec3 instanceCenter = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float instScale = length(instanceMatrix[0].xyz); // uniform scale column
          // organic sway: bend the node center with its own phase/amp (matches filament tips)
          instanceCenter += swayDir(aSwayPhase) * (aSwayAmp * uSwayAmt) * sin(uSwayTime * uSwayFreq + aSwayPhase);
          // soft breathing: per-instance sinusoidal scale (desynced phase+freq => not mechanical).
          // Plus an excitation boost when a signal pulse departs/arrives this node: a brief
          // scale-up + brightness that decays each frame (set in the animate loop).
          float breath = 1.0 + uBreathAmt * sin(uTime * aBreathFreq + aBreathPhase);
          float scaleBoost = 1.0 + vExcite * uExciteAmt * 0.35;
          // camera right/up in WORLD space = rows of the view matrix (billboard the quad)
          vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float size = instScale * uSizeScale * breath * scaleBoost;
          vec3 worldPos = instanceCenter + (camRight * position.x + camUp * position.y) * size;
          vec4 mvPos = viewMatrix * vec4(worldPos, 1.0);
          vViewDist = length(mvPos.xyz); // camera-relative distance for fog
          vUv = position.xy + 0.5;       // 0..1 across the quad
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vViewDist;
        varying float vExcite;
        uniform float uCorePower;
        uniform float uHaloPower;
        uniform float uCoreWhite;
        uniform float uBody;
        uniform float uFogDensity;
        uniform float uExciteAmt;
        void main(){
          vec2 p = vUv - 0.5;
          float d = length(p) * 2.0;     // 0 center -> 1 edge of the quad
          if (d > 1.0) discard;          // round disk, not a square
          float fall = 1.0 - d;
          float core = pow(fall, uCorePower); // hot core (tight)
          float halo = pow(fall, uHaloPower); // soft halo (broad) -> drives alpha
          // Excitation: a signal arriving/departing makes the node briefly hotter +
          // whiter (electrical "firing"). Widen the core and push the peak toward white.
          float ex = vExcite * uExciteAmt;
          core = min(core + ex * 0.5, 1.0);
          vec3 hot  = mix(vColor, vec3(1.0), min(uCoreWhite + ex * 0.4, 0.95));
          vec3 body = vColor * uBody;
          vec3 col  = mix(body, hot, core);   // smooth body -> hot center
          float alpha = halo * (1.0 + ex * 0.4);
          // exp2 fog: distant glows fade into the near-black bg. Additive only adds, so fade
          // by multiplying contribution (bg ~= fog color, so this matches FogExp2 on opaque).
          float fog = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
          col   *= (1.0 - fog);
          alpha *= (1.0 - fog);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, totalNodes);
    nodeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(totalNodes * 3), 3);
    // Per-instance sway params (phase, amplitude) so the node billboard sways in
    // sync with the filaments that attach to it (detachment-free). Both come from
    // nodeSway[i]; spine nodes have amp 0 => fixed (the camera stop stays put).
    nodeMesh.geometry.setAttribute('aSwayPhase', new THREE.InstancedBufferAttribute(new Float32Array(totalNodes), 1));
    nodeMesh.geometry.setAttribute('aSwayAmp',   new THREE.InstancedBufferAttribute(new Float32Array(totalNodes), 1));
    // Breathing (per-instance desynced phase+freq) + excitation (updated each frame by
    // the pulse system when a signal departs/arrives this node => the node "fires").
    nodeMesh.geometry.setAttribute('aBreathPhase', new THREE.InstancedBufferAttribute(new Float32Array(totalNodes), 1));
    nodeMesh.geometry.setAttribute('aBreathFreq',  new THREE.InstancedBufferAttribute(new Float32Array(totalNodes), 1));
    const aExciteAttr = new THREE.InstancedBufferAttribute(new Float32Array(totalNodes), 1);
    nodeMesh.geometry.setAttribute('aExcite', aExciteAttr);
    const exciteArr = aExciteAttr.array; // updated each frame in animate()
    // Medical grounding (action potential): a neuron that fires enters an ABSOLUTE
    // refractory period during which it is completely unresponsive to further input
    // (voltage-gated Na+ channels are inactivated) -> this is what forces DISCRETE
    // readable pulses instead of sustained near-max brightness on hub nodes that
    // have many convergent filaments. Convergent inputs use a SATURATING combine
    // (spatial/temporal summation plateaus, never grows unbounded): it doesn't matter
    // whether 2 or 10 pulses arrive together past a point, the postsynaptic response
    // saturates. fireNode is the SINGLE entry point for every depart/arrive boost.
    const refractUntil = new Float32Array(totalNodes); // absolute-refractory gate (seconds)
    function fireNode(idx: number, env: number, now: number){
      if (idx < 0 || idx >= exciteArr.length) return;
      if (now < refractUntil[idx]) return;                 // absolute refractory: ignore input
      const w = env * 0.9;                                 // per-event input weight
      const e = 1 - (1 - exciteArr[idx]) * (1 - w);         // saturating combine (plateaus <=1)
      exciteArr[idx] = e;
      if (e > 0.4) refractUntil[idx] = now + cfg.refractory; // crossed firing threshold -> refractory
    }
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const nodeColors: THREE.Color[] = []; // per-node accent color so pulses can inherit their origin node's color
    const secCount = secondary.length;
    for (let i = 0; i < totalNodes; i++){
      let pos, scale, accent, lift;
      if (i < M){                       // spine (camera stops)
        pos = S[i]; scale = 1.0 * (0.85 + rng() * 0.4); accent = rng() < 0.18 ? PALETTE.nodeAccent : PALETTE.node; lift = 1.15;
      } else if (i < M + secCount){     // secondary (depth 1)
        const s = i - M; pos = secondary[s]; scale = (0.4 + rng() * 0.5) * (0.85 + rng() * 0.4); accent = rng() < 0.12 ? PALETTE.nodeAccent : PALETTE.node; lift = 1.0;
      } else {                          // recursive sub-network (depth >= 2): inherit the nearest spine
        const n = subNodes[i - M - secCount];            // accent so a cyan soma's dendrite stays cyan
        pos = n.pos; scale = (0.20 + rng() * 0.22) * Math.pow(0.82, n.depth); accent = null; lift = 1.0;
      }
      dummy.position.copy(pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      nodeMesh.setMatrixAt(i, dummy.matrix);
      if (accent == null) col.copy(nodeColors[subNodes[i - M - secCount].origin]).lerp(new THREE.Color(PALETTE.node), 0.15);
      else col.setHex(accent);
      col.multiplyScalar(lift);
      nodeMesh.setColorAt(i, col);
      nodeColors[i] = col.clone();
      nodeMesh.geometry.attributes.aSwayPhase.array[i] = nodeSway[i][0];
      nodeMesh.geometry.attributes.aSwayAmp.array[i]   = nodeSway[i][1];
      // desynced breathing: each node gets a unique phase + slightly different freq
      // (0.5..1.3 rad/s) so the population breathes organically, never in lockstep.
      nodeMesh.geometry.attributes.aBreathPhase.array[i] = srand(i * 4.7 + 2.2) * Math.PI * 2;
      nodeMesh.geometry.attributes.aBreathFreq.array[i]  = 0.5 + srand(i * 9.3 + 0.6) * 0.8;
    }
    nodeMesh.instanceMatrix.needsUpdate = true;
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
    nodeMesh.geometry.attributes.aSwayPhase.needsUpdate = true;
    nodeMesh.geometry.attributes.aSwayAmp.needsUpdate = true;
    nodeMesh.geometry.attributes.aBreathPhase.needsUpdate = true;
    nodeMesh.geometry.attributes.aBreathFreq.needsUpdate = true;
    nodeMesh.renderOrder = 1; // additive node glows draw on top of filament tubes
    scene.add(nodeMesh);

    // --- connection curves (main axons through S) ---
    const nodeConnCurves = [];
    for (let i = 0; i < M - 1; i++){
      nodeConnCurves.push({ curve: makeCurve(S[i], S[i + 1], i * 2 + 1), main: true });
    }
    const secondaryCurves = [];
    for (let s = 0; s < secondary.length; s++){
      secondaryCurves.push({ curve: makeCurve(S[secondaryParent[s]], secondary[s], 1000 + s), main: false });
    }

    // Per-spine-node list of MAIN-BRANCH curves that ORIGINATE at that node
    // (getPointAt(0) == S[i] -> the pulse departs FROM the reached node).
    // Forward axon S[i]->S[i+1] for interior/early nodes; the last node (no
    // forward spine) falls back to the previous axon reversed (S[i]->S[i-1]).
    // Node 0 is left empty (the trigger gate skips it: "from the second node on").
    const origins: any[][] = [];
    for (let i = 0; i < M; i++){
      const list = [];
      if (i < M - 1) list.push({ curve: nodeConnCurves[i].curve, dir: 1 });
      else if (i >= 1) list.push({ curve: nodeConnCurves[i - 1].curve, dir: -1 });
      origins.push(list);
    }

    // Ambient-pulse pool: every filament (spine axon + secondary branch) is a
    // candidate, tagged with its ORIGIN node index (getPointAt(0) == that node)
    // so each pulse can inherit its origin node's accent color. Fisher-Yates
    // shuffle => randomized coverage; pulseCoverage caps how many filaments carry
    // a live pulse (1.0 = all filaments, each exactly once — avoids the old
    // random-with-replacement issue where some curves got 2+ pulses and others 0).
    const pulsePool = [];
    for (let i = 0; i < nodeConnCurves.length; i++) pulsePool.push({ curve: nodeConnCurves[i].curve, origin: i, dest: i + 1, radius: cfg.tubeRadius });
    for (let s = 0; s < secondaryCurves.length; s++) pulsePool.push({ curve: secondaryCurves[s].curve, origin: secondaryParent[s], dest: M + s, radius: cfg.tubeRadius * 0.7 });
    // A FRACTION of the recursive sub-network twigs also carry an ambient pulse
    // (origin = the twig's nearest spine node => pulse inherits that accent color),
    // so the dense sub-mesh reads as alive without a pulse on every twig (which
    // would be visually noisy). subPulseFrac governs the fraction.
    const subPulseCount = Math.floor(subCurves.length * cfg.subPulseFrac);
    const subPulseShuf = subCurves.slice();
    for (let i = subPulseShuf.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); const t = subPulseShuf[i]; subPulseShuf[i] = subPulseShuf[j]; subPulseShuf[j] = t; }
    for (let i = 0; i < subPulseCount; i++) pulsePool.push({ curve: subPulseShuf[i].curve, origin: subPulseShuf[i].originIdx, dest: subPulseShuf[i].tipIdx, radius: cfg.tubeRadius * 0.5 * Math.pow(0.8, subPulseShuf[i].depth), irregular: !!subPulseShuf[i].t2 });
    for (let i = pulsePool.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); const t: any = pulsePool[i]; pulsePool[i] = pulsePool[j]; pulsePool[j] = t; }
    const pulseCount = Math.max(1, Math.floor(pulsePool.length * cfg.pulseCoverage));

    // --- merged tube mesh (single draw call) ---
    // Attach per-vertex curve-tangent + sway params so the filament shader can
    // detect axial (down-the-barrel) views AND bend organically. Sway is baked as
    // a per-vertex phase + amplitude = lerp(rootNodeSway, tipNodeSway, u). The
    // root vertex (u=0) gets the parent node's (phase,amp) and the tip vertex
    // (u=1) gets the child node's — so a tube endpoint and its node share the
    // exact same sway params => identical displacement => NO detachment, while
    // the branch bends between them (amp grows root->tip). Spine axons connect
    // two amp-0 spine nodes => no sway (camera path stays stable).
    // TubeGeometry lays out verts as (tub+1)*(rad+1); tangent + sway are
    // constant across each ring, sampled at u = i/tub.
    const tubeGeos = [];
    for (let i = 0; i < nodeConnCurves.length; i++){
      const seg = Math.max(8, Math.floor(cfg.tubeSeg));
      tubeGeos.push(tubeWithTangent(nodeConnCurves[i].curve, seg, cfg.tubeRadius, cfg.tubeRad, nodeSway[i], nodeSway[i + 1]));
    }
    for (let s = 0; s < secondaryCurves.length; s++){
      const seg = Math.max(12, Math.floor(cfg.tubeSeg * 0.8));
      tubeGeos.push(tubeWithTangent(secondaryCurves[s].curve, seg, cfg.tubeRadius * 0.7, cfg.tubeRad,
        nodeSway[secondaryParent[s]], nodeSway[M + s]));
    }
    for (let c = 0; c < subCurves.length; c++){
      const sc = subCurves[c];
      // More tubular segments than before: the multi-waypoint CatmullRom meanders,
      // so a low-seg tube cuts corners and the (true-curve) pulse would appear to
      // leave the visible filament on bends. Scale by depth so deep short twigs
      // stay light while shallow long branches resolve their wander. Still one
      // merged draw call; verts stay well inside the desktop headroom.
      const seg = Math.max(10, Math.floor(cfg.tubeSeg * 0.55 * Math.pow(0.85, sc.depth)));
      const rad = Math.max(3, Math.floor(cfg.tubeRad * 0.6));
      tubeGeos.push(tubeWithTangent(sc.curve, seg, cfg.tubeRadius * 0.5 * Math.pow(0.8, sc.depth), rad,
        nodeSway[sc.rootIdx], nodeSway[sc.tipIdx]));
    }
    const tubeGeo = mergeGeometries(tubeGeos, false);
    tubeGeos.forEach(g => g.dispose());
    // Filament shader: view-angle falloff on tube normals -> luminous core
    // (facing the camera) fading to a dull silhouette edge. TubeGeometry emits
    // smooth outward normals, so dot(N,viewDir) is high at the visible center
    // line and ~0 at the rounded edge -> reads as a glowing filament, not a wire.
    // The camera travels ALONG the spine, so spine segments are frequently seen
    // axially (down the barrel), where every visible normal is perpendicular to
    // the view -> dot(N,V) collapses to 0 and the core term goes dark. We pass
    // the curve tangent per vertex and add an axiality floor: when the view is
    // along the tube (|dot(tangent, viewDir)| -> 1) we lift the core toward a
    // uniform glow so the spine reads as a lit filament from every angle. Side
    // views keep full center-line contrast because the floor term is ~0 there.
    const tubeMat = new THREE.ShaderMaterial({
      uniforms: {
        uColorDim:   { value: new THREE.Color(PALETTE.tube) },
        uColorCore:  { value: new THREE.Color(PALETTE.tube).lerp(new THREE.Color(0xffffff), 0.45) },
        uCorePower:  { value: cfg.tubeCorePower },
        uAxialFloor: { value: cfg.axialFloor },
        uFogColor:   { value: new THREE.Color(PALETTE.bg) },
        uFogDensity: { value: cfg.fog },
        uSwayTime:   { value: 0 },
        uSwayAmt:    { value: reduced ? 0 : cfg.swayAmt },
        uSwayFreq:   { value: cfg.swayFreq },
        uTime:       { value: 0 },
        uShimmer:    { value: reduced ? 0 : 0.28 },
      },
      vertexShader: `
        attribute vec3 tangent;
        attribute float aSwayPhase;
        attribute float aSwayAmp;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying float vFogDepth;
        varying float vAxial;
        varying float vTubeU;
        uniform float uSwayTime, uSwayAmt, uSwayFreq;
        // Same phase->direction map as the node shader so a tube endpoint and its
        // node share the same phase => same direction => identical displacement.
        vec3 swayDir(float ph){
          return normalize(vec3(sin(ph * 2.1) + 0.30, cos(ph * 1.7) + 0.20, sin(ph * 3.3) + 0.40));
        }
        void main(){
          // tubeMesh has no transform => object space == world space; displace the
          // vertex by its baked sway (phase+amp lerp root->tip) before the view xform.
          // Endpoints (u=0/u=1) carry the parent/child node's exact sway params, so
          // the wire tip meets the swaying node with no gap.
          vec3 swayed = position + swayDir(aSwayPhase) * (aSwayAmp * uSwayAmt) * sin(uSwayTime * uSwayFreq + aSwayPhase);
          vec4 mv = modelViewMatrix * vec4(swayed, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          vFogDepth = -mv.z;
          vec3 vt = normalize(normalMatrix * tangent);
          vAxial = abs(dot(vt, vViewDir));
          vTubeU = uv.y;          // 0->1 along the filament length (TubeGeometry uv)
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorDim;
        uniform vec3 uColorCore;
        uniform float uCorePower;
        uniform float uAxialFloor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform float uTime;
        uniform float uShimmer;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying float vFogDepth;
        varying float vAxial;
        varying float vTubeU;
        void main(){
          float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
          float core = pow(facing, uCorePower);
          core = max(core, uAxialFloor * vAxial);
          // Myelin / bioconductive shimmer: a slow traveling brightness wave along
          // the filament length (uv.y). Evokes segmented myelin internodes + the
          // "living wire" feel of action-potential conduction. Subtle (uShimmer<0.3)
          // so it never competes with the node glow or blooms into noise.
          float shimmer = 1.0 + uShimmer * sin(vTubeU * 9.0 - uTime * 1.4);
          core *= shimmer;
          vec3 col = mix(uColorDim, uColorCore, core);
          float a = mix(0.18, 0.9, core);
          float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
          col = mix(col, uFogColor, fogF);
          a *= (1.0 - fogF);
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);

    // --- neuropil background field (Step 4) ---
    // Not a starfield: a continuation of the existing network outward. Neuroscience
    // grounding: somas (nodes) are SPARSE bright points (~16-79k/mm3); the inter-soma
    // space is NEUROPIL, a saturated felt of fine processes (up to 9km fiber/mm3),
    // roughly UNIFORM density, slightly denser near fiber bundles, thinner at edges.
    // Human neurons grow longer dendrites to MAINTAIN that fill despite wider soma
    // spacing. So the goal = uniform-ish low-contrast haze hugging the filaments,
    // sparse bright nodes against it, NOT a void and NOT a bright blob.
    // 60% of points hug filaments (denser bundles), 40% fill inter-filament gaps near
    // spine nodes (diffuse uniform fill); each point inherits its nearest node's
    // accent color so it reads as the SAME tissue expanding outward, not a separate
    // starfield. THREE.Points = 1 draw call regardless of count; all drift on GPU.
    let nebulaMesh: THREE.Points | null = null;
    // Stateful nebula mouse-interaction sim (fluid hand-in-liquid): per-particle CPU
    // spring-damper. nebRest = spring target (original sampled pos), nebVel = velocities,
    // nebSettled = idle flag (skips the loop + upload when nothing is moving -> mobile perf).
    let nebRest: Float32Array | null = null, nebVel: Float32Array | null = null, nebNP = 0, nebSim = false, nebSettled = true;
    if (cfg.nebulaPoints > 0){
      const nebCurves = [];
      for (let i = 0; i < nodeConnCurves.length; i++) nebCurves.push({ curve: nodeConnCurves[i].curve, origin: i });
      for (let s = 0; s < secondaryCurves.length; s++) nebCurves.push({ curve: secondaryCurves[s].curve, origin: secondaryParent[s] });
      // Include the recursive sub-network so the neuropil tissue hugs the full
      // dendritic mesh, not just the spine + first branches (origin = nearest
      // spine node => inherits that accent tint).
      for (let c = 0; c < subCurves.length; c++) nebCurves.push({ curve: subCurves[c].curve, origin: subCurves[c].originIdx });
      // Irwin-Hall (sum of 3 uniforms, centered) -> mild gaussian, deterministic via rng.
      const gauss = () => (rng() + rng() + rng() - 1.5) * 1.4;
      const nP = cfg.nebulaPoints;
      const pos = new Float32Array(nP * 3);
      const col = new Float32Array(nP * 3);
      const drift = new Float32Array(nP * 3);
      const phase = new Float32Array(nP);
      const sz = new Float32Array(nP);
      const tmpC = new THREE.Color();
      const tubeTint = new THREE.Color(PALETTE.tube);
      const _np = new THREE.Vector3();
      for (let i = 0; i < nP; i++){
        let origin, bx, by, bz;
        if (rng() < 0.6 && nebCurves.length){
          // hug a filament: gaussian around a random curve point (denser bundle)
          const c = nebCurves[(rng() * nebCurves.length) | 0];
          c.curve.getPointAt(rng(), _np);
          origin = c.origin;
          const sp = cfg.nebulaSpread * 0.5 * (0.4 + rng() * 0.8);
          bx = _np.x + gauss() * sp; by = _np.y + gauss() * sp; bz = _np.z + gauss() * sp;
        } else {
          // fill inter-filament gaps: wider gaussian around a random spine node
          const ni = (rng() * M) | 0;
          const p = S[ni];
          origin = ni;
          const sp = cfg.nebulaSpread * 1.2 * (0.5 + rng() * 0.7);
          bx = p.x + gauss() * sp; by = p.y + gauss() * sp; bz = p.z + gauss() * sp;
        }
        pos[i*3] = bx; pos[i*3+1] = by; pos[i*3+2] = bz;
        // inherit nearest node accent color, dimmed + 25% toward tube tint for uniformity
        tmpC.copy(nodeColors[origin]).multiplyScalar(0.45).lerp(tubeTint, 0.25);
        col[i*3] = tmpC.r; col[i*3+1] = tmpC.g; col[i*3+2] = tmpC.b;
        const dx = gauss(), dy = gauss(), dz = gauss();
        const dl = Math.hypot(dx, dy, dz) || 1;
        drift[i*3] = dx/dl; drift[i*3+1] = dy/dl; drift[i*3+2] = dz/dl;
        phase[i] = rng() * Math.PI * 2;
        sz[i] = 0.15 + Math.pow(rng(), 2.5) * 1.4; // power-law (exp 2.5): many tiny, fewer as size grows (neuropil dust)
      }
      // Stateful mouse-interaction sim buffers: rest = original sampled positions (spring
      // target), vel = velocities. `pos` (above) is the LIVE position buffer -- mutated
      // by the CPU spring-damper each frame (animate) and uploaded via needsUpdate.
      nebRest = new Float32Array(pos);
      nebVel = new Float32Array(nP * 3);
      nebNP = nP;
      nebSim = true;
      const nebGeo = new THREE.BufferGeometry();
      nebGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      nebGeo.setAttribute('aColor',  new THREE.BufferAttribute(col, 3));
      nebGeo.setAttribute('aDrift',  new THREE.BufferAttribute(drift, 3));
      nebGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
      nebGeo.setAttribute('aSize',   new THREE.BufferAttribute(sz, 1));
      const nebMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime:       { value: 0 },
          uSize:       { value: cfg.nebulaSize },
          uOpacity:    { value: cfg.nebulaOpacity },
          uFogDensity: { value: cfg.fog },
          uDriftAmt:   { value: reduced ? 0 : cfg.nebulaDrift },
          uPixelRatio: { value: renderer.getPixelRatio() },
        },
        vertexShader: `
          attribute vec3 aColor; attribute vec3 aDrift; attribute float aPhase; attribute float aSize;
          varying vec3 vColor; varying float vFogDepth; varying float vPhase;
          uniform float uTime, uSize, uDriftAmt, uPixelRatio;
          void main(){
            vColor = aColor;
            vPhase = aPhase;
            // position = CPU-simulated current pos (stateful mouse spring-damper, run in
            // animate()) + slow GPU drift. The mouse interaction is STATEFUL on the CPU
            // (pos buffer mutated each frame); the shader only adds the ambient drift.
            vec3 pos = position + aDrift * sin(uTime * 0.25 + aPhase) * uDriftAmt;
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            vFogDepth = -mv.z;
            gl_PointSize = clamp(aSize * uSize * uPixelRatio * 20.0 / max(-mv.z, 6.0), 1.2, 7.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor; varying float vFogDepth; varying float vPhase;
          uniform float uOpacity, uFogDensity, uTime;
          void main(){
            vec2 pc = gl_PointCoord - 0.5;
            float d = length(pc) * 2.0;
            if (d > 1.0) discard;
            // core glow + a faint broad haze base so overlapping particles read as
            // diffuse tissue rather than isolated dots (neuropil felt, not a starfield).
            float core = pow(1.0 - d, 1.5);
            float haze = pow(1.0 - d, 0.5) * 0.18;
            // Subtle per-point twinkle: a slow secondary opacity sine (distinct freq
            // 0.7 vs drift's 0.25) so the haze reads as living tissue, not static dust.
            // Amplitude tiny (±12%) so it never fights the Step 6 bloom/fog tuning.
            float twk = 1.0 + 0.12 * sin(uTime * 0.7 + vPhase * 2.7);
            float a = (core + haze) * uOpacity * twk;
            vec3 col = vColor;
            float fog = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
            col *= (1.0 - fog);
            a   *= (1.0 - fog);
            gl_FragColor = vec4(col, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      nebulaMesh = new THREE.Points(nebGeo, nebMat);
      nebulaMesh.renderOrder = -1; // background: behind tubes (0) and nodes (1)
      scene.add(nebulaMesh);
    }

    // --- Tier 3: far background — PRECOMPUTED space colonization (far-network.json,
    // generated offline by tools/generate-far-network.mjs; attractor density fades
    // outward from the network and tapers softly at the camera corridor, so the
    // near-dense/far-sparse gradient and the corridor falloff are baked into the
    // topology itself). Runtime builds render geometry through the SAME machinery
    // as tiers 1/2: makeCurve organic curves, tubeWithTangent + the shared tubeMat
    // (view-angle core + axial floor + shimmer + sway + fog), the shared nodeMat
    // billboards, and the same fractional ambient-pulse pattern. Only the topology
    // generation differs. Ambient-only: no fire-wave/refractory sim out here.
    let t3TubeMesh: THREE.Mesh | null = null, t3NodeMesh: THREE.InstancedMesh | null = null, t3PulseMesh: THREE.InstancedMesh | null = null, t3DustMesh: THREE.Points | null = null, t3TubeMat: THREE.ShaderMaterial | null = null;
    const t3PulseData: any[] = [];
    let t3ExciteArr: Float32Array | null = null, t3ExciteAttr: THREE.InstancedBufferAttribute | null = null; // per-node firing (somas light as pulses pass)
    let pulseMatShared: THREE.ShaderMaterial | null = null; // set by the pulse block below; tier 3 reuses it (identical look)
    function buildTier3(net: { nodes: number[][]; edges: number[][] }){
      const nodes = net.nodes;   // [x, y, z, depthFromRoot, clusterId, rallRadius]
      const nN = nodes.length;
      if (!nN) return;
      // per-node sway: same hash + depth-amplitude pattern as tiers 1/2 (roots
      // fixed, amplitude grows toward tips) => same organic motion language.
      const depthAmpT3 = [0, 0.10, 0.18, 0.26, 0.30, 0.32];
      const swPh = new Float32Array(nN), swAm = new Float32Array(nN);
      // Orange accent per NODE (not per cluster) so amber somas scatter through
      // the mostly-cyan far field exactly like the main cluster, and every
      // cluster reads as its own mixed-tint neuron rather than a monochrome blob.
      const nodeAccent = (i: number) => srand(i * 2.17 + 5.1) < cfg.t3Accent;
      const rallOf = (i: number) => (nodes[i][5] == null ? 0.3 : nodes[i][5]); // Rall diameter 0..1
      for (let i = 0; i < nN; i++){
        swPh[i] = srand((90000 + i) * 12.9 + 1.1) * Math.PI * 2;
        swAm[i] = depthAmpT3[Math.min(nodes[i][3], depthAmpT3.length - 1)];
      }
      // Tubes: SAME makeCurve + tubeWithTangent, ONE merged draw call. Per-edge
      // radius follows Rall's 3/2 power law (baked into far-network.json): thick
      // TRUNK caliber near each cluster's soma, tapering to fine distal tips, so
      // every dendrite tuft reads as PART OF a neuron (trace tip -> branch ->
      // trunk -> soma) instead of a disconnected fleck floating in the black.
      // t3TubeRadius = terminal caliber, t3TrunkRadius = soma-trunk caliber.
      const seg = Math.max(8, Math.round(cfg.tubeSeg * 0.55 * cfg.t3SegScale));
      const step = cfg.t3EdgeFrac >= 1 ? 1 : Math.round(1 / cfg.t3EdgeFrac);
      const geos = [];
      const edgeCurves = [];
      const _ea = new THREE.Vector3(), _eb = new THREE.Vector3();
      const rad0 = cfg.t3TubeRadius, radT = cfg.t3TrunkRadius;
      for (let e = 0; e < net.edges.length; e++){
        if (step > 1 && (e % step)) continue;
        const ai = net.edges[e][0], bi = net.edges[e][1];
        _ea.set(nodes[ai][0], nodes[ai][1], nodes[ai][2]);
        _eb.set(nodes[bi][0], nodes[bi][1], nodes[bi][2]);
        if (_ea.distanceToSquared(_eb) < 1e-4) continue;
        const curve = makeCurve(_ea, _eb, 20000 + e);
        edgeCurves.push({ curve, a: ai, b: bi });
        // caliber for this segment = Rall diameter at its trunk-side end (thicker
        // node) mapped from terminal->trunk radius (quadratic so the taper reads).
        // AVERAGE the two endpoints' caliber (not max) and taper linearly, so
        // adjacent segments step smoothly instead of one bulging thick out of
        // nowhere next to thin neighbours. Also caps at the gentler t3TrunkRadius.
        const rallAvg = 0.5 * (rallOf(ai) + rallOf(bi));
        const radius = rad0 + (radT - rad0) * rallAvg;
        geos.push(tubeWithTangent(curve, seg, radius, cfg.t3Radial, [swPh[ai], swAm[ai]], [swPh[bi], swAm[bi]]));
      }
      if (!geos.length) return;
      const merged = mergeGeometries(geos, false);
      geos.forEach(g => g.dispose());
      // SAME shader as tiers 1/2 (identical visual language) but a dedicated
      // instance so the far field reads as PRESENT through fog: a higher axial
      // floor lights thin filaments seen at any angle, and a brightened dim color
      // lifts them out of the black. Not a new shader — same code, tuned uniforms
      // (exactly as tier 2 differs from tier 1 only by cfg values).
      t3TubeMat = tubeMat.clone();
      t3TubeMat.uniforms.uAxialFloor.value = cfg.t3AxialFloor;
      t3TubeMat.uniforms.uColorDim.value = new THREE.Color(PALETTE.tube).multiplyScalar(cfg.t3Bright);
      t3TubeMat.uniforms.uColorCore.value = new THREE.Color(PALETTE.tube).lerp(new THREE.Color(0xffffff), 0.5);
      t3TubeMesh = new THREE.Mesh(merged, t3TubeMat);
      t3TubeMesh.renderOrder = -1;                  // background, behind main tubes(0)/nodes(1)
      scene.add(t3TubeMesh);
      // Node billboards: shared nodeMat (same glow/sway/breathing/excitation
      // shader). Soma size scales with Rall diameter => cluster roots are bright
      // cell bodies, distal tips are tiny — reinforcing the trunk->tuft hierarchy.
      const g3 = nodeGeo.clone();
      g3.setAttribute('aSwayPhase', new THREE.InstancedBufferAttribute(swPh, 1));
      g3.setAttribute('aSwayAmp', new THREE.InstancedBufferAttribute(swAm, 1));
      const bp = new Float32Array(nN), bf = new Float32Array(nN);
      for (let i = 0; i < nN; i++){ bp[i] = srand(i * 4.7 + 9.2) * Math.PI * 2; bf[i] = 0.5 + srand(i * 9.3 + 4.6) * 0.8; }
      g3.setAttribute('aBreathPhase', new THREE.InstancedBufferAttribute(bp, 1));
      g3.setAttribute('aBreathFreq', new THREE.InstancedBufferAttribute(bf, 1));
      t3ExciteArr = new Float32Array(nN);
      t3ExciteAttr = new THREE.InstancedBufferAttribute(t3ExciteArr, 1);
      g3.setAttribute('aExcite', t3ExciteAttr);
      t3NodeMesh = new THREE.InstancedMesh(g3, nodeMat, nN);
      t3NodeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nN * 3), 3);
      const d3 = new THREE.Object3D(), c3 = new THREE.Color();
      for (let i = 0; i < nN; i++){
        d3.position.set(nodes[i][0], nodes[i][1], nodes[i][2]);
        const r = rallOf(i);
        d3.scale.setScalar(cfg.t3NodeScale * (0.9 + 2.2 * r) * (0.7 + srand(i * 3.7 + 0.4) * 0.5));
        d3.updateMatrix();
        t3NodeMesh.setMatrixAt(i, d3.matrix);
        c3.set(nodeAccent(i) ? PALETTE.nodeAccent : PALETTE.node);
        t3NodeMesh.setColorAt(i, c3);
      }
      t3NodeMesh.instanceMatrix.needsUpdate = true;
      t3NodeMesh.instanceColor.needsUpdate = true;
      t3NodeMesh.renderOrder = 0;
      scene.add(t3NodeMesh);

      // --- per-cluster neuropil dust (Points, 1 draw call) ---
      // The same felt-of-fine-processes haze that hugs the MAIN cluster, now
      // around EVERY far cluster too. Power-law sizes (exp 2.5): many tiny motes,
      // fewer large ones. 70% hug filaments (denser near dendrites), 30% fill the
      // gaps around somas. Each mote inherits its cluster's accent tint => reads
      // as the same tissue, not a separate starfield.
      if (cfg.t3Dust > 0){
        const nD = cfg.t3Dust;
        const dpos = new Float32Array(nD * 3), dcol = new Float32Array(nD * 3), dsz = new Float32Array(nD), dph = new Float32Array(nD);
        const gaussD = () => (srandCursor() + srandCursor() + srandCursor() - 1.5) * 1.4;
        let _sc = 71.3; function srandCursor(){ _sc += 1.618; return srand(_sc); }
        const tubeTint = new THREE.Color(PALETTE.tube), tmp = new THREE.Color();
        const _dp = new THREE.Vector3();
        for (let i = 0; i < nD; i++){
          let cl, bx, by, bz, srcNode;
          if (srandCursor() < 0.7 && edgeCurves.length){
            const ec = edgeCurves[(srandCursor() * edgeCurves.length) | 0];
            ec.curve.getPointAt(srandCursor(), _dp);
            srcNode = ec.a;
            const sp = cfg.t3DustSpread * (0.4 + srandCursor() * 0.8);
            bx = _dp.x + gaussD() * sp; by = _dp.y + gaussD() * sp; bz = _dp.z + gaussD() * sp;
          } else {
            const ni = (srandCursor() * nN) | 0;
            srcNode = ni;
            const sp = cfg.t3DustSpread * 1.6 * (0.5 + srandCursor() * 0.7);
            bx = nodes[ni][0] + gaussD() * sp; by = nodes[ni][1] + gaussD() * sp; bz = nodes[ni][2] + gaussD() * sp;
          }
          dpos[i*3] = bx; dpos[i*3+1] = by; dpos[i*3+2] = bz;
          tmp.set(nodeAccent(srcNode) ? PALETTE.nodeAccent : PALETTE.node).multiplyScalar(0.5).lerp(tubeTint, 0.25);
          dcol[i*3] = tmp.r; dcol[i*3+1] = tmp.g; dcol[i*3+2] = tmp.b;
          dsz[i] = 0.15 + Math.pow(srandCursor(), 2.5) * 1.5; // power-law: many small, few large
          dph[i] = srandCursor() * Math.PI * 2;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
        dg.setAttribute('aColor', new THREE.BufferAttribute(dcol, 3));
        dg.setAttribute('aSize', new THREE.BufferAttribute(dsz, 1));
        dg.setAttribute('aPhase', new THREE.BufferAttribute(dph, 1));
        const dm = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 }, uSize: { value: cfg.t3DustSize }, uOpacity: { value: 0.55 },
            uFogDensity: { value: cfg.fog }, uPixelRatio: { value: renderer.getPixelRatio() },
          },
          vertexShader: `
            attribute vec3 aColor; attribute float aSize; attribute float aPhase;
            varying vec3 vColor; varying float vFogDepth; varying float vPhase;
            uniform float uSize, uPixelRatio;
            void main(){
              vColor = aColor; vPhase = aPhase;
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vFogDepth = -mv.z;
              gl_PointSize = clamp(aSize * uSize * uPixelRatio * 20.0 / max(-mv.z, 6.0), 1.0, 6.0);
              gl_Position = projectionMatrix * mv;
            }
          `,
          fragmentShader: `
            varying vec3 vColor; varying float vFogDepth; varying float vPhase;
            uniform float uOpacity, uFogDensity, uTime;
            void main(){
              vec2 pc = gl_PointCoord - 0.5; float d = length(pc) * 2.0;
              if (d > 1.0) discard;
              float core = pow(1.0 - d, 1.5); float haze = pow(1.0 - d, 0.5) * 0.18;
              float twk = 1.0 + 0.12 * sin(uTime * 0.7 + vPhase * 2.7);
              float a = (core + haze) * uOpacity * twk;
              float fog = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
              gl_FragColor = vec4(vColor * (1.0 - fog), a * (1.0 - fog));
            }
          `,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        t3DustMesh = new THREE.Points(dg, dm);
        t3DustMesh.renderOrder = -2; // behind the far tubes
        scene.add(t3DustMesh);
      }

      // Ambient pulses: same fractional-coverage pattern + pulse material as the
      // main cluster's sub-twigs => identical look. As each pulse departs/arrives
      // it FIRES the soma at that end (writes t3ExciteArr, read by the shared node
      // shader) so light sparks node-to-node through every far cluster, like the
      // main one. Personality-skip irregularity is applied in the animate loop.
      if (pulseMatShared && !reduced && cfg.t3PulseCount > 0){
        const count = Math.min(cfg.t3PulseCount, edgeCurves.length);
        // Distribute pulses across ALL clusters (round-robin over per-cluster
        // buckets) so no cluster is left dark — every far network sparks, not just
        // the ones that happened to win a random draw.
        const buckets = new Map();
        for (const ec of edgeCurves){
          const cl = nodes[ec.a][4];
          let b = buckets.get(cl); if (!b){ b = []; buckets.set(cl, b); }
          b.push(ec);
        }
        for (const b of buckets.values())
          for (let i = b.length - 1; i > 0; i--){ const j = Math.floor(srand(i * 3.1 + 0.7 + b.length) * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
        const order = [...buckets.values()];
        const shuf = [];
        for (let round = 0; shuf.length < count; round++){
          let added = false;
          for (const b of order){ if (b[round]){ shuf.push(b[round]); added = true; if (shuf.length >= count) break; } }
          if (!added) break;
        }
        const pg = new THREE.PlaneGeometry(1, 1);
        const widths = new Float32Array(count);
        const cols = [];
        for (let i = 0; i < count; i++){
          const ec = shuf[i];
          const rallAvg = 0.5 * (rallOf(ec.a) + rallOf(ec.b));
          const radius = rad0 + (radT - rad0) * rallAvg;
          widths[i] = 2 * radius * cfg.pulseWidthRatio; // pulse sized to its filament caliber
        }
        pg.setAttribute('aTangent', new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
        pg.setAttribute('aWidth', new THREE.InstancedBufferAttribute(widths, 1));
        t3PulseMesh = new THREE.InstancedMesh(pg, pulseMatShared, count);
        t3PulseMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
        for (let i = 0; i < count; i++){
          const ec = shuf[i];
          t3PulseData.push({ curve: ec.curve, speed: cfg.pulseSpeed * (0.6 + srand(i * 5.3 + 2.2) * 0.8),
                             offset: srand(i * 8.9 + 0.3), gap: cfg.pulseGap * (1.2 + srand(i * 2.7 + 4.1) * 1.6),
                             pseed: i * 7.31 + 42.5, a: ec.a, b: ec.b });
          c3.set(nodeAccent(ec.a) ? PALETTE.nodeAccent : PALETTE.node);
          t3PulseMesh.setColorAt(i, c3);
        }
        t3PulseMesh.instanceColor.needsUpdate = true;
        t3PulseMesh.renderOrder = 2;
        scene.add(t3PulseMesh);
      }
      if (process.env.NODE_ENV !== 'production') {
        console.info('[mind] tier3 loaded:', nN, 'nodes,', edgeCurves.length, 'edges, tubeSeg', seg, 'dust', cfg.t3Dust);
      }
    }
    fetch(farNetworkUrl)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(buildTier3)
      .catch(e => console.warn('[neural] tier3 skipped (far-network.json):', e.message || e));

    // --- ambient signal pulses travelling along a few connection curves ---
    // Billboarded, additive-blended glow sprites (plane + procedural radial-gradient
    // texture), elongated along the curve tangent for a comet/pulse feel. Replaces the
    // old instanced icosahedrons (which read as tiny balls on a track, not light in a
    // wire). 1 draw call via InstancedMesh; texture generated once, shared.
    const particleCount = reduced ? 0 : pulseCount;
    let particleMesh: THREE.InstancedMesh | null = null;
    let pulseTex: THREE.DataTexture | null = null;
    const particleData: any[] = [];
    let trigMesh: THREE.InstancedMesh | null = null;
    const trigData: any[] = [];
    let scheduleTrigger: ((nodeIdx: number) => void) | null = null;
    if (particleCount > 0){
      // pulsePool (with origin indices + shuffled) built above, near origins.
      // Procedural radial-gradient alpha texture (white center -> transparent edge),
      // runtime canvas, no external asset. White so the per-pulse uniform color tints
      // it; AdditiveBlending accumulates light (ICS MEDIA / SO canonical glow texture).
      pulseTex = makePulseTexture();
      const pGeo = new THREE.PlaneGeometry(1, 1);
      const pMat = new THREE.ShaderMaterial({
        uniforms: {
          uTex:        { value: pulseTex },
          uElong:      { value: cfg.pulseElong },
          uOpacity:    { value: cfg.pulseOpacity },
          uFogDensity: { value: cfg.fog },
          uTailSharp:  { value: cfg.pulseTailSharp }, // lengthwise taper speed (higher = dimmer tail faster)
          uPeak:       { value: cfg.pulsePeak },       // explicit peak cap, provably below node peak
          uWidthEnd:   { value: cfg.pulseWidthEnd },   // end width / center width (< 1 => ends thinner than filament)
        },
        vertexShader: `
          attribute vec3 aTangent; // analytic curve tangent at tt (normalized, getTangentAt) -> elongation axis
          attribute float aWidth;   // per-instance sphere diameter = 1.2x this filament's tube diameter (contained)
          varying float vUvy;       // width cross-section coord (0..1) -> tight round falloff independent of length
          varying float vLen;       // 0 at center, 1 at both ends -> symmetric lengthwise fade
          varying float vStretch;   // 0 = round dot (down the barrel), ~1 = tiny contained taper (side-on)
          varying float vViewDist;
          varying vec3 vColor;
          uniform float uElong;    // max length / diameter (1.15 => tight leading+trailing taper, contained to filament)
          uniform float uWidthEnd;  // end width / center width (< 1 => ends come to a point within the filament)
          void main(){
            vColor = instanceColor; // per-instance color = origin node accent (cyan/amber)
            vec3 head = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            float instScale = length(instanceMatrix[0].xyz); // = env (emerge/absorb)
            vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
            vec3 camFwd   = vec3(-viewMatrix[0][2], -viewMatrix[1][2], -viewMatrix[2][2]);
            // DIRECTION from the analytic tangent at the particle's tt (curve-accurate:
            // the true local direction of the filament at that point). The contained
            // sphere's tiny leading/trailing taper aligns to this so it reads as light
            // traveling ALONG the wire, not a cross-bar. A round point at getPointAt(tt)
            // is ON the curve by definition (no bend problem), and the taper is sub-
            // filament-width so it never cuts a bend -- even on the tortuous sub-twigs.
            vec3 dir = aTangent;                       // already normalized by three.js getTangentAt
            vec3 dirProj = dir - camFwd * dot(dir, camFwd); // project tangent onto camera plane (billboard)
            float dpLen = length(dirProj);             // ~0 down the barrel, ~1 side-on (view-angle collapse)
            vec3 axisA = dpLen > 0.001 ? dirProj / dpLen : camRight; // elongation axis = projected tangent
            vec3 axisB = normalize(cross(camFwd, axisA));
            // CONTAINED length: a fixed fraction of the SPHERE diameter (uElong), NOT a
            // chord/arc-derived streak. Research (Codrops "High-speed Light Trails"):
            // light traveling along a tube lives ON the tube geometry; for a DISCRETE
            // neural impulse (a point, not a long motion-blur streak -- action potentials
            // are spikes), the faithful translation is a contained point on the wire, not
            // a billboard stretched across it. trail collapses to w (round dot) when the
            // filament points at the camera (dpLen->0) and grows to uElong only side-on.
            float w = aWidth;                                  // sphere diameter = 1.2x filament diameter
            float trail = w * mix(1.0, uElong, dpLen);          // round down-barrel -> 1.15x diameter side-on
            vStretch = smoothstep(1.0, 1.2, trail / w);          // 0 round dot -> ~1 tiny taper (engages pointy ends)
            // SYMMETRIC leading + trailing (reverted from head-anchored): the glow
            // extends both ahead of and behind the particle. Width TAPERS so the
            // light stays CONTAINED within the filament: center = aWidth (slightly
            // thicker than the tube), ends = aWidth*uWidthEnd (thinner than the
            // tube) => reads as the wire lighting up at the particle, not glow
            // escaping the filament. The taper only applies when stretched; a round
            // dot (down the barrel, vStretch->0) stays uniformly round.
            float xf = abs(position.x) * 2.0;                  // 0 center -> 1 both ends
            float taper = mix(1.0, uWidthEnd, xf);             // center 1.0 -> ends uWidthEnd
            float widthProfile = mix(1.0, taper, vStretch);    // dot -> uniform 1.0 (round)
            vec3 worldPos = head + instScale * (axisA * position.x * trail + axisB * position.y * w * widthProfile);
            vec4 mvPos = viewMatrix * vec4(worldPos, 1.0);
            vViewDist = length(mvPos.xyz);
            vUvy = position.y + 0.5;                           // width cross-section -> tight round falloff
            vLen = xf;                                         // symmetric: bright center, dim both ends
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          varying float vUvy;
          varying float vLen;
          varying float vStretch;
          varying float vViewDist;
          varying vec3 vColor;
          uniform sampler2D uTex;
          uniform float uOpacity;
          uniform float uFogDensity;
          uniform float uTailSharp;
          uniform float uPeak;
          void main(){
            // WIDTH falloff: sample the radial texture ONLY along its vertical cross-
            // section (fixed x=0.5) => a tight circular falloff across the width that
            // stays round regardless of how far the quad is stretched lengthwise (the
            // old full-quad sample mapped a circle onto a 3x-stretched plane => an oval
            // blob, uniformly soft along its whole length).
            float widthFade = texture2D(uTex, vec2(0.5, vUvy)).a;
            // LENGTH falloff: SYMMETRIC fast exponential decay from the bright center
            // (vLen=0) toward BOTH ends (vLen->1). Mixes to uniform (1.0) as the streak
            // collapses into a round dot (vStretch->0, down the barrel) so the dot stays
            // evenly bright instead of half-dim along its (now invisible) length.
            float lenFade = mix(1.0, exp(-vLen * uTailSharp), vStretch);
            float a = widthFade * lenFade;
            // Per-instance color with a SHARP white-hot core (action-potential spike /
            // overshoot): pow 8 shrinks the hot spot to the very center (a~1) and the
            // 0.90 white-mix pushes that tight center near-pure-white. This makes the
            // pulse read as a crisp white "signal spike" distinct from the colored
            // (cyan/amber) filament shimmer + node body it travels over -- so it stands
            // OUT against a bright filament instead of blending (same color family).
            // The surrounding glow (a<1) keeps the origin color => cyan/amber identity
            // preserved; only the tiny center goes white-hot. uPeak caps the output
            // so the pulse peak stays below a firing node's peak.
            vec3 col = mix(vColor, vec3(1.0), pow(a, 8.0) * 0.90) * uPeak;
            float fog = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
            a *= uOpacity * (1.0 - fog);
            gl_FragColor = vec4(col, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: false,   // additive glow "light inside the filament": composite OVER the
                           // tube (the pulse quad sits on the tube's axis, so the tube surface
                           // is closer to camera -> depthTest:true occludes the bright core
                           // entirely; only a sliver of halo poked past the edge -> invisible).
                           // depthTest:false lets the contained-width glow draw over the
                           // filament, which reads as "the wire lights up at the pulse".
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      pulseMatShared = pMat; // tier 3 reuses the same pulse material => identical look
      particleMesh = new THREE.InstancedMesh(pGeo, pMat, particleCount);
      particleMesh.geometry.setAttribute('aTangent', new THREE.InstancedBufferAttribute(new Float32Array(particleCount * 3), 3));
      const aWidthArr = new Float32Array(particleCount);
      particleMesh.geometry.setAttribute('aWidth', new THREE.InstancedBufferAttribute(aWidthArr, 1));
      particleMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(particleCount * 3), 3);
      for (let i = 0; i < particleCount; i++){
        const c = pulsePool[i]; // each filament at most once (shuffled) -> all filaments covered at coverage 1.0
        // pulseSpeed = traversal rate (curve-fraction/sec). Per-particle variance so
        // pulses desync rather than marching in lockstep. offset = phase. gap = the
        // refractory dark fraction (in curve-units) AFTER a full 0->1 traversal,
        // so the cycle is (1 + gap): pulse reaches the next node, fades, sits dark,
        // then re-emerges at the start node.
        particleData.push({ curve: c.curve, speed: cfg.pulseSpeed * (0.75 + rng() * 0.5),
                            offset: rng(), gap: cfg.pulseGap, origin: c.origin, dest: c.dest,
                            irregular: !!c.irregular, pseed: i * 7.31 + 1.7 });
        particleMesh!.setColorAt(i, nodeColors[c.origin]); // inherit origin node's accent color
        // Contained sphere: diameter = 1.2x THIS filament's tube diameter
        // (pulseWidthRatio). Per-instance (aWidth) so a spine axon (radius
        // 0.045) and a thin sub-twig (radius ~0.02) each get a glow sized to
        // their own wire => the light stays ON the filament it travels, never
        // a floating ball and never escaping. depthTest:false + bright peak
        // (uPeak) let it read over the (bright) tube it sits on => "the wire
        // lights up at the pulse" (Codrops: the light lives on the tube).
        aWidthArr[i] = 2 * c.radius * cfg.pulseWidthRatio;
      }
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
      particleMesh.renderOrder = 2;
      scene.add(particleMesh);

      // --- triggered pulses: fire one from the node the camera just reached ---
      // Separate InstancedMesh (geometry cloned, NOT shared: aTangent is a
      // per-geometry instanced attribute, so sharing geometry would collide the
      // two tangent arrays). Same material/texture as ambient -> identical look;
      // the arrival-tied timing is what reads as "triggered." Generous pool so
      // fast scrolling never recycles an in-flight pulse (which would pop).
      const trigCount = cfg.triggerPulses;
      const trigGeo = pGeo.clone();
      trigMesh = new THREE.InstancedMesh(trigGeo, pMat, trigCount);
      trigMesh.geometry.setAttribute('aTangent', new THREE.InstancedBufferAttribute(new Float32Array(trigCount * 3), 3));
      trigMesh.geometry.setAttribute('aWidth', new THREE.InstancedBufferAttribute(new Float32Array(trigCount).fill(2 * cfg.tubeRadius * cfg.pulseWidthRatio), 1));
      trigMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(trigCount * 3), 3);
      trigMesh.renderOrder = 2;
      // init all slots invisible (scale 0) + default color so dormant slots never read black
      dummy.scale.setScalar(0); dummy.position.set(0, 0, 0); dummy.updateMatrix();
      const defCol = new THREE.Color(PALETTE.particle);
      for (let s = 0; s < trigCount; s++){ trigMesh.setMatrixAt(s, dummy.matrix); trigMesh.setColorAt(s, defCol); }
      if (trigMesh.instanceColor) trigMesh.instanceColor.needsUpdate = true;
      scene.add(trigMesh);

      for (let s = 0; s < trigCount; s++) trigData.push({ active: false, curve: null, dir: 1, startTime: 0, speed: 0 });

      // Procedural timing: per-node stable "personality" (some nodes lean early,
      // some late — consistent character across passes, not identical every
      // time) plus organic irregularity — occasional skip (a neuron that didn't
      // fire), occasional double-fire burst, wider timing spread incl. a rare
      // late-fire tail, wider speed variance. Driven by the deterministic srand()
      // hash + Math.random so it reads alive, not metronomic.
      // dir: 1 forward S[i]->S[i+1], -1 reversed (last-node fallback) S[i]->S[i-1].
      scheduleTrigger = function(nodeIdx: number){
        const list = origins[nodeIdx];
        if (!list || list.length === 0) return;
        const personality = srand(nodeIdx * 13.7 + 7.3); // stable 0..1 per node
        if (Math.random() < 0.12) return;                   // ~12% skip: silent arrival
        const firePulse = (extraJit: number) => {
          let slot = -1;
          for (let s = 0; s < trigData.length; s++) if (!trigData[s].active){ slot = s; break; }
          if (slot < 0) return; // pool full: DROP, never recycle an in-flight pulse (that was the mid-filament vanish bug)
          const entry = list[Math.floor(Math.random() * list.length)];
          // base spread [-early, -early+width]; per-node lean +/-0.4s; rare late tail
          const base = -cfg.triggerEarly + Math.random() * cfg.triggerJitter;
          const lean = (personality - 0.5) * 0.8;
          const lateTail = Math.random() < 0.15 ? 0.4 + Math.random() * 0.9 : 0;
          const jit = base + lean + lateTail + extraJit;
          const speed = cfg.pulseSpeed * (0.7 + Math.random() * 0.7); // 0.7..1.4x variance
          trigData[slot] = { active: true, curve: entry.curve, dir: entry.dir,
                             startTime: clock.elapsedTime + jit, speed,
                             origin: nodeIdx, dest: nodeIdx + entry.dir };
          trigMesh!.setColorAt(slot, nodeColors[nodeIdx]); // cyan/amber = origin node accent
          if (trigMesh!.instanceColor) trigMesh!.instanceColor!.needsUpdate = true;
        };
        firePulse(0);
        if (Math.random() < 0.18) firePulse(0.12 + Math.random() * 0.25); // ~18% double-fire burst
      };
    }

    // --- camera path = per-segment bezier curves through the vantages V ---
    // Interior V[i]=S[i]+(0,1.4,0) so dir_V==dir_S => the camera curve is the tube curve
    // shifted up by 1.4 => the camera flies exactly along the visible axon (just above it).
    // Uniform-per-segment sampling (not arc-length) so u = i/(M-1) lands EXACTLY on V[i].
    const camCurves: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < M - 1; i++){
      camCurves.push(makeCurve(V[i], V[i + 1], i * 2 + 1));
    }
    // Spine node curves (S) — same per-segment CatmullRom as the axons/camera path
    // (shared seed) so a gaze target sampled on these tracks the travel direction.
    const spineCurves = nodeConnCurves.map(c => c.curve);
    const _pos = new THREE.Vector3();
    const _look = new THREE.Vector3();
    const _origin = new THREE.Vector3(0, 0, 0);
    function sampleSeg(u: number, curves: THREE.Curve<THREE.Vector3>[], pts: THREE.Vector3[], target: THREE.Vector3){
      if (pts.length < 2){ target.copy(pts[0]); return target; }
      const segF = clamp(u, 0, 1) * (pts.length - 1);
      const seg = clamp(Math.floor(segF), 0, pts.length - 2);
      const lt = clamp(segF - seg, 0, 1);
      curves[seg].getPoint(lt, target);
      return target;
    }
    // Gaze target = a point on the CURVED neural spine (the axon path the camera
    // travels), sampled a little ahead so the camera leans into the next node.
    // Replaces the old LINEAR lerp between S nodes: that put a hard gaze-direction
    // corner at every node boundary (position curved smoothly, gaze did not) ->
    // the visible "head-turn" jank. Sampling the same smooth CatmullRom as the
    // camera path keeps gaze C1-smooth within a segment and C0 at nodes (matching
    // the position's continuity), so the orientation never snaps. (DEPT cinematic
    // camera / three.js discourse: lookAt discontinuity is the #1 scroll-jank source.)
    function lookTarget(u: number, target: THREE.Vector3){
      if (S.length < 2){ target.copy(S[0]); return target; }
      return sampleSeg(clamp(u, 0, 1), spineCurves, S, target);
    }

    // --- post processing ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    let bloomPass: UnrealBloomPass | null = null;
    if (cfg.bloom){
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(viewW, viewH),
        cfg.bloomStrength, cfg.bloomRadius, cfg.bloomThreshold
        // Step 6 final co-tune (busier scene: sub-network, contained pulses,
        // excitation firing, sway, shimmer, nebula haze). Threshold 0.6 keeps it
        // above the nebula haze (~0.1-0.2 lum) + tube shimmer baseline so they DON'T
        // bloom (no background wash), while node cores + excited-firing peaks (additive,
        // exceed 1.0) still bloom into a soft halo. Strength 0.45 (softer, eye-comfort),
        // radius 0.85 (broad soft halo, less banding than a tight kernel). Mobile: bloom
        // off — shader glow carries the look (see cfg.mobile).
      );
      composer.addPass(bloomPass);
    }
    composer.addPass(new OutputPass());
    composer.setSize(viewW, viewH);

    /**
     * Scroll is PUSHED in through setProgress and never read, and nothing here ever
     * writes it back. The prototype did both: ScrollTrigger.onUpdate early-returned for
     * the whole 1.6s of a flight (so the wheel did nothing), then onComplete called
     * window.scrollTo and moved the document up to eight viewport heights in one frame.
     * Deleting the write is what makes that class of defect unreachable rather than
     * merely un-triggered.
     */
    function setProgress(t: number) {
      const next = clamp(t, 0, 1);
      if (flight) {
        // A page moving AWAY from the flight's target is a user overriding it. A page
        // moving toward it is the caller's own smooth scroll, which must not cancel.
        const was = Math.abs(scrollProgress - flight.to);
        const now = Math.abs(next - flight.to);
        if (now > was + 0.005) cancelFlight();
      }
      scrollProgress = next;
    }

    /** power2.inOut — the ease the prototype asked GSAP for, in one line. */
    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function cancelFlight() {
      if (!flight) return;
      const settle = flight.resolve;
      flight = null;
      settle();
    }

    /**
     * Fly the CAMERA to a stop. Not the page: moving the document is the caller's
     * decision, made with the caller's easing, and cancellable by the reader.
     */
    function flyTo(stopIndex: number, seconds?: number): Promise<void> {
      const target = M > 1 ? clamp(Math.round(stopIndex), 0, M - 1) / (M - 1) : 0;
      cancelFlight();
      if (reduced || seconds === 0) {
        displayProgress = target;
        scrollProgress = target;
        return Promise.resolve();
      }
      const duration = Math.max(0.05, seconds == null ? 1.6 : seconds);
      return new Promise<void>((resolve) => {
        flight = { from: displayProgress, to: target, t: 0, duration, resolve };
      });
    }

    /** Advances an in-flight tween. Returns whether it owned displayProgress this frame. */
    function stepFlight(dt: number) {
      if (!flight) return false;
      flight.t += dt;
      const k = clamp(flight.t / flight.duration, 0, 1);
      displayProgress = flight.from + (flight.to - flight.from) * easeInOut(k);
      if (k >= 1) {
        scrollProgress = flight.to;
        cancelFlight();
      }
      return true;
    }

    let raf = 0;
    const clock = new THREE.Clock();
    let frames = 0, fpsTime = performance.now();

    function animate(){
      raf = view.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (stepFlight(dt)) {
        // the tween owns displayProgress this frame
      } else if (reduced){
        const stop = clamp(Math.round(scrollProgress * (M - 1)), 0, M - 1);
        displayProgress = M > 1 ? stop / (M - 1) : 0;
      } else {
        const k = 1 - Math.exp(-8 * dt);
        displayProgress += (scrollProgress - displayProgress) * k;
      }

      const u = clamp(displayProgress, 0, 1);
      sampleSeg(u, camCurves, V, _pos);
      camera.position.copy(_pos);
      lookTarget(clamp(u + 0.05, 0, 1), _look);
      camera.lookAt(_look);

      const stop = clamp(Math.round(u * (M - 1)), 0, M - 1);
      if (stop !== currentStop){
        currentStop = stop;
        if (onArriveAtNodeCb) onArriveAtNodeCb(stop);
        // Fire a triggered pulse from the node the camera just reached — but only
        // from the second spine node onward (node 0 left to the ambient loop).
        if (stop >= 1 && scheduleTrigger) scheduleTrigger(stop);
      }

      // Node excitation: decay all, then boost nodes that a signal is currently
      // departing (tt<0.2) or arriving (tt>0.8) so a node briefly "fires" when a
      // pulse enters/leaves it. O(pulses)/frame; written to the aExcite instance attr.
      // dt-SCALED decay (Step B): the old `*= 0.90` ran once/frame with no dt, so the
      // brighten/decay speed varied with framerate. exp(-k*dt) is framerate-independent
      // (same visible decay rate on 30fps mobile as 60fps desktop). k=6.3 matches the
      // prior ~0.90/frame @ 60fps feel (halflife ~0.11s -> a clean repolarization fall).
      const excDecay = Math.exp(-cfg.exciteDecay * dt);
      for (let i = 0; i < exciteArr.length; i++) exciteArr[i] *= excDecay;

      if (particleMesh){
        const t = clock.elapsedTime;
        const tna = particleMesh.geometry.attributes.aTangent.array;
        for (let i = 0; i < particleData.length; i++){
          const pd = particleData[i];
          // Cycle = (1 + gap): tt runs a FULL 0->1 traversal (reaches the next
          // node) then a refractory dark gap across the wrap. Phase advances at
          // pulseSpeed, so frequency = speed/(1+gap) — proportional to travel speed.
          const cyc = 1 + pd.gap;
          const ph = (t * pd.speed + pd.offset) % cyc;
          let tt, env;
          if (ph < 1) {
            tt = ph;
            // Smooth emerge from node A (tt 0->fade) + smooth absorb into node B
            // (1-fade->1), full-bright travel between. Reaches tt=1 = node B,
            // fading to 0. smoothstep => C1, no pop at the node (true depart/arrive).
            const f = 0.15;
            const lead = smoothstep(0, f, tt);
            const trail = 1 - smoothstep(1 - f, 1, tt);
            env = lead < trail ? lead : trail;
          } else {
            tt = 1;          // sit at node B (invisible: scale 0)
            env = 0;         // dark refractory gap — B->A teleport hidden in the dark
          }
          // Tier-2 irregularity: a stable per-pulse hash occasionally skips a whole
          // cycle (same personality pattern as the triggered pulses — a neuron that
          // didn't fire) so the midground never flickers metronomically. Tier-1
          // pulses (irregular=false) are untouched.
          if (pd.irregular && env > 0){
            const cycN = Math.floor((t * pd.speed + pd.offset) / cyc);
            if (srand(pd.pseed + cycN * 13.7) < 0.22) env = 0;
          }
          // fire the node a signal is leaving (tt<0.2) or entering (tt>0.8).
          // fireNode applies a SATURATING combine + ABSOLUTE refractory gate (medical:
          // a neuron can't re-fire during its refractory period), so a hub with many
          // convergent pulses fires once per refractory window -> distinct discrete
          // pulses, never sustained near-max brightness. `t` = clock.elapsedTime.
          if (env > 0.05){
            if (tt < 0.2) fireNode(pd.origin, env, t);
            if (tt > 0.8) fireNode(pd.dest, env, t);
          }
          const p = pd.curve.getPointAt(tt);
          if (p && isFinite(p.x)){
            dummy.position.copy(p);
            dummy.scale.setScalar(env); // 0 in gap / at nodes -> draws nothing
            dummy.updateMatrix();
            particleMesh.setMatrixAt(i, dummy.matrix);
            // Analytic tangent at tt drives the contained sphere's tiny leading/
            // trailing taper axis, so the glow reads as light traveling ALONG the wire
            // at all angles incl. the tortuous sub-branch bends.
            const tan = pd.curve.getTangentAt(tt);
            if (tan && isFinite(tan.x)){
              const k = i * 3;
              tna[k] = tan.x; tna[k+1] = tan.y; tna[k+2] = tan.z;
            }
          }
        }
        particleMesh.instanceMatrix.needsUpdate = true;
        particleMesh.geometry.attributes.aTangent.needsUpdate = true;
      }

      // Triggered pulses: one-shot signals fired on arrival at a spine node.
      // age = elapsed - startTime; <0 => dormant (waiting to fire, invisible).
      // tt = clamp(age*speed,0,1) over a full traversal (reaches the next node),
      // same smoothstep emerge/absorb envelope as ambient -> smooth depart/arrive.
      // dir<0 runs the curve reversed (1-tt) so the last node's backward fallback
      // still departs FROM S[i]. Slot frees itself once travel + tail is done.
      if (trigMesh){
        const t = clock.elapsedTime;
        const tna = trigMesh.geometry.attributes.aTangent.array;
        for (let s = 0; s < trigData.length; s++){
          const td = trigData[s];
          if (!td.active || td.curve == null){
            dummy.scale.setScalar(0); dummy.updateMatrix(); trigMesh.setMatrixAt(s, dummy.matrix); continue;
          }
          const age = t - td.startTime;
          if (age < 0){ // dormant: not yet fired
            dummy.scale.setScalar(0); dummy.updateMatrix(); trigMesh.setMatrixAt(s, dummy.matrix); continue;
          }
          const tt = clamp(age * td.speed, 0, 1);
          const f = 0.15;
          const lead = smoothstep(0, f, tt);
          const trail = 1 - smoothstep(1 - f, 1, tt);
          const env = lead < trail ? lead : trail;
          // fire the origin (departing) + dest (arriving) nodes for this triggered pulse
          // (same discrete-firing refractory gate as ambient -> hub nodes don't stay maxed).
          if (env > 0.05){
            if (tt < 0.2) fireNode(td.origin, env, t);
            if (tt > 0.8) fireNode(td.dest, env, t);
          }
          const pt = td.dir > 0 ? tt : 1 - tt; // reverse for backward fallback
          const p = td.curve.getPointAt(pt);
          if (p && isFinite(p.x)){
            dummy.position.copy(p);
            dummy.scale.setScalar(env); // 0 at both nodes -> smooth emerge/absorb, no pop
            dummy.updateMatrix();
            trigMesh.setMatrixAt(s, dummy.matrix);
            // Analytic tangent at pt drives the contained sphere's taper axis
            // (curve-accurate direction). dir<0 = backward travel (last-node
            // fallback) => negate the curve's forward tangent so the taper points
            // along the actual travel direction.
            const tan = td.curve.getTangentAt(pt);
            if (tan && isFinite(tan.x)){
              if (td.dir < 0) tan.negate();
              const k = s * 3; tna[k] = tan.x; tna[k+1] = tan.y; tna[k+2] = tan.z;
            }
          }
          if (age * td.speed > 1.3) td.active = false; // travel + tail done -> free slot
        }
        trigMesh.instanceMatrix.needsUpdate = true;
        trigMesh.geometry.attributes.aTangent.needsUpdate = true;
      }

      // Nebula uTime (drift + twinkle) + STATEFUL mouse spring-damper sim.
      if (nebulaMesh){
        (nebulaMesh!.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
        // Fluid hand-in-liquid: per-particle CPU spring-damper. The cursor RAY
        // (depth-independent -> works at all scroll positions + all depths) repels
        // nearby particles; they PERSIST (don't snap back) and return viscously (~1s
        // overdamped ooze) -- NOT the old instant stateless shader displacement that
        // read as a "lens". Uses point-to-RAY distance (the cursor ray is the "hand"
        // through the scene). Self-disables when idle+settled (no loop, no upload)
        // for mobile perf; semi-implicit Euler with dt clamped (no explode on stall).
        if (nebSim && (mouseActive || !nebSettled)) {
          const posAttr = nebulaMesh.geometry.attributes.position;
          const pArr = posAttr.array;
          let rayActive = false, ox=0,oy=0,oz=0, rdx=0,rdy=0,rdz=0, pX=0,pZ=0;
          if (mouseActive && !reduced && cfg.nebulaMouse > 0) {
            raycaster.setFromCamera(mouseNDC, camera);
            const r = raycaster.ray;
            ox=r.origin.x; oy=r.origin.y; oz=r.origin.z;
            rdx=r.direction.x; rdy=r.direction.y; rdz=r.direction.z;
            // perp to the ray via world-up (for the on-ray singularity: push particles
            // exactly on the cursor ray off in a defined direction). cross(D,(0,1,0))
            // = (-D.z, 0, D.x); falls back to no-push if the ray is vertical (rare).
            const cx = -rdz, cz = rdx, cl = Math.hypot(cx, cz) || 1;
            pX = cx/cl; pZ = cz/cl;
            rayActive = true;
          }
          const R = cfg.nebulaMouseRadius, R2 = R*R, S = cfg.nebulaMouse;
          const k = 4.0, c = 5.0, dtc = Math.min(dt, 0.05); // k=spring, c=viscous drag (overdamped -> fluid ooze, no bounce)
          let maxV2 = 0;
          for (let i = 0; i < nebNP; i++) {
            const ix = i*3;
            let px = pArr[ix], py = pArr[ix+1], pz = pArr[ix+2];
            const rx = nebRest![ix], ry = nebRest![ix+1], rz = nebRest![ix+2];
            let vx = nebVel![ix], vy = nebVel![ix+1], vz = nebVel![ix+2];
            // spring to rest + viscous drag (always -> fluid return home after push)
            let ax = -k*(px-rx) - c*vx;
            let ay = -k*(py-ry) - c*vy;
            let az = -k*(pz-rz) - c*vz;
            // mouse repulsion from the cursor RAY (depth-independent)
            if (rayActive) {
              const wx=px-ox, wy=py-oy, wz=pz-oz;
              const t = wx*rdx + wy*rdy + wz*rdz;       // projection of (P-O) onto ray dir
              if (t > 0) {                              // particle in front of camera
                // closest point on ray = O + D*t; diff = P - closest = (P-O) - D*t
                const ddx = wx - rdx*t, ddy = wy - rdy*t, ddz = wz - rdz*t;
                const d2 = ddx*ddx + ddy*ddy + ddz*ddz;  // squared distance to the ray
                if (d2 < R2) {
                  if (d2 > 1e-6) {
                    const d = Math.sqrt(d2);
                    const f = S * (1 - d/R) / d;        // smooth falloff, normalized dir
                    ax += f*ddx; ay += f*ddy; az += f*ddz;
                  } else {
                    ax += S*pX; az += S*pZ;             // on the ray: push perp (off the cursor)
                  }
                }
              }
            }
            // semi-implicit Euler (symplectic -> stable for springs)
            vx += ax*dtc; vy += ay*dtc; vz += az*dtc;
            px += vx*dtc; py += vy*dtc; pz += vz*dtc;
            nebVel![ix]=vx; nebVel![ix+1]=vy; nebVel![ix+2]=vz;
            pArr[ix]=px; pArr[ix+1]=py; pArr[ix+2]=pz;
            const v2 = vx*vx+vy*vy+vz*vz;
            if (v2 > maxV2) maxV2 = v2;
          }
          nebSettled = maxV2 < 1e-4;                    // idle: skip loop + upload next frames
          if (!nebSettled) posAttr.needsUpdate = true; // only upload when something actually moved
        }
      }
      // Drive the organic wind-sway on nodes + filaments from the same clock so
      // they stay in sync (a node and its filament tips share phase => identical
      // displacement, no detachment). uSwayAmt is 0 under reduced-motion (set at
      // init), so this is a no-op there.
      nodeMat.uniforms.uSwayTime.value = clock.elapsedTime;
      tubeMat.uniforms.uSwayTime.value = clock.elapsedTime;
      // Breathing + myelin shimmer + node-firing excitation share the same clock.
      nodeMat.uniforms.uTime.value = clock.elapsedTime;
      tubeMat.uniforms.uTime.value = clock.elapsedTime;
      aExciteAttr.needsUpdate = true; // push the per-frame excitation to the GPU
      // Tier-3 shares the node/pulse shaders but has its own tube material + dust;
      // drive their clocks so far sway/shimmer/breathing/twinkle stay in sync.
      if (t3TubeMat){ t3TubeMat.uniforms.uSwayTime.value = clock.elapsedTime; t3TubeMat.uniforms.uTime.value = clock.elapsedTime; }
      if (t3DustMesh) (t3DustMesh!.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
      // decay tier-3 soma firing (framerate-independent, same law as the main cluster)
      if (t3ExciteArr){
        const d = Math.exp(-cfg.exciteDecay * dt);
        for (let i = 0; i < t3ExciteArr.length; i++) t3ExciteArr[i] *= d;
      }

      // Tier-3 ambient pulses: same cycle/envelope/analytic-tangent logic as the
      // main ambient pool + the same personality-skip irregularity. Light and
      // randomized — no fire-wave/refractory simulation in the far field.
      if (t3PulseMesh){
        const t = clock.elapsedTime;
        const tna = t3PulseMesh.geometry.attributes.aTangent.array;
        for (let i = 0; i < t3PulseData.length; i++){
          const pd = t3PulseData[i];
          const cyc = 1 + pd.gap;
          const ph = (t * pd.speed + pd.offset) % cyc;
          let tt, env;
          if (ph < 1){
            tt = ph;
            const f = 0.15;
            const lead = smoothstep(0, f, tt);
            const trail = 1 - smoothstep(1 - f, 1, tt);
            env = lead < trail ? lead : trail;
          } else { tt = 1; env = 0; }
          if (env > 0){
            const cycN = Math.floor((t * pd.speed + pd.offset) / cyc);
            if (srand(pd.pseed + cycN * 13.7) < 0.3) env = 0; // skipped fire
          }
          // FIRE the soma at whichever end the pulse is departing/arriving, so
          // light sparks node-to-node through every far cluster (same saturating
          // combine as the main cluster's fireNode; no refractory needed ambiently).
          if (env > 0.05 && t3ExciteArr){
            const fi = tt < 0.2 ? pd.a : (tt > 0.8 ? pd.b : -1);
            if (fi >= 0 && fi < t3ExciteArr.length){
              t3ExciteArr[fi] = 1 - (1 - t3ExciteArr[fi]) * (1 - env * 0.9);
            }
          }
          const p = pd.curve.getPointAt(tt);
          if (p && isFinite(p.x)){
            dummy.position.copy(p);
            dummy.scale.setScalar(env);
            dummy.updateMatrix();
            t3PulseMesh.setMatrixAt(i, dummy.matrix);
            const tan = pd.curve.getTangentAt(tt);
            if (tan && isFinite(tan.x)){ const k = i * 3; tna[k] = tan.x; tna[k+1] = tan.y; tna[k+2] = tan.z; }
          }
        }
        t3PulseMesh.instanceMatrix.needsUpdate = true;
        t3PulseMesh.geometry.attributes.aTangent.needsUpdate = true;
      }
      if (t3ExciteAttr) t3ExciteAttr.needsUpdate = true; // push far soma firing to the GPU

      composer.render();

      frames++;
      const now = performance.now();
      if (now - fpsTime >= 500){
        if (onFps) onFps(Math.round(frames * 1000 / (now - fpsTime)));
        frames = 0; fpsTime = now;
      }
    }

    function resize(w: number, h: number){
      if (!(w > 0) || !(h > 0)) return;
      viewW = w; viewH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      if (bloomPass) bloomPass.setSize(w, h);
      if (nebulaMesh) (nebulaMesh!.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = renderer.getPixelRatio();
      if (t3DustMesh) (t3DustMesh!.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = renderer.getPixelRatio();
    }

    // Stateful nebula mouse interaction (fluid hand-in-liquid): the cursor RAY
    // (depth-independent) repels nearby particles via a per-particle CPU spring-damper
    // sim run in animate(). Particles PERSIST when pushed and return viscously (~1s
    // overdamped ooze) -- NOT the instant stateless shader displacement that read as a
    // "lens". We store the cursor NDC on move and build the ray each frame in animate()
    // (so it tracks the scrolling camera -- the old world-origin plane only worked
    // near the start). Point-to-RAY distance (not a point) avoids the depth problem.
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2(2, 2); // start off-screen
    let mouseActive = false;
    function onPointerMove(e: PointerEvent){
      mouseNDC.x = (e.clientX / viewW) * 2 - 1;
      mouseNDC.y = -(e.clientY / viewH) * 2 + 1;
      mouseActive = true;
    }
    function onPointerOut(){ mouseActive = false; }
    doc.addEventListener('pointermove', onPointerMove, { passive: true });
    doc.addEventListener('pointerleave', onPointerOut);
    /**
     * Reduced motion, applied live.
     *
     * The prototype read the media query once at module scope (`:446`), so a reader who
     * turned the OS setting on had to reload the page to be listened to. Sway, breathing,
     * shimmer and nebula drift go to zero — the same values the construction-time branch
     * used — and the pulse meshes are hidden rather than rebuilt, because rebuilding them
     * means regenerating geometry for a setting that can be toggled twice a second.
     */
    function applyReducedMotion(){
      nodeMat.uniforms.uSwayAmt.value = reduced ? 0 : cfg.swayAmt;
      nodeMat.uniforms.uBreathAmt.value = reduced ? 0 : 0.06;
      tubeMat.uniforms.uSwayAmt.value = reduced ? 0 : cfg.swayAmt;
      tubeMat.uniforms.uShimmer.value = reduced ? 0 : 0.28;
      if (nebulaMesh) (nebulaMesh.material as THREE.ShaderMaterial).uniforms.uDriftAmt.value = reduced ? 0 : cfg.nebulaDrift;
      if (t3TubeMat) t3TubeMat.uniforms.uShimmer.value = reduced ? 0 : 0.28;
      if (particleMesh) particleMesh.visible = !reduced;
      if (trigMesh) trigMesh.visible = !reduced;
      if (t3PulseMesh) t3PulseMesh.visible = !reduced;
    }

    function setReducedMotion(on: boolean){
      const next = !!on;
      if (next === reduced) return;
      reduced = next;
      if (reduced) cancelFlight();
      applyReducedMotion();
    }

    function setPaused(p: boolean){
      const next = !!p;
      if (next === paused || disposed) return;
      paused = next;
      if (paused){
        view.cancelAnimationFrame(raf);
        raf = 0;
      } else {
        // Discard the delta accumulated while hidden, or the first frame back jumps.
        clock.getDelta();
        raf = view.requestAnimationFrame(animate);
      }
    }

    /**
     * A lost context leaves the page black and the rAF loop spinning on a dead GPU.
     * preventDefault asks the browser to restore it; until it does, we stop rendering
     * and the caller is told, so it can show the same plain dark ground it shows when
     * WebGL was never available.
     */
    function onContextLost(e: Event){
      e.preventDefault();
      setPaused(true);
      opts.onContextLost?.('lost');
    }
    function onContextRestored(){
      setPaused(false);
    }
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    function dispose(){
      if (disposed) return;
      disposed = true;
      view.cancelAnimationFrame(raf);
      raf = 0;
      cancelFlight();
      doc.removeEventListener('pointermove', onPointerMove);
      // The prototype removed `mousemove` and left `mouseleave` attached (`:2092` vs
      // `:2096`). Both go here, and so does every listener added since.
      doc.removeEventListener('pointerleave', onPointerOut);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      nodeGeo.dispose(); nodeMat.dispose();
      tubeGeo.dispose(); tubeMat.dispose();
      if (nebulaMesh){ nebulaMesh.geometry.dispose(); (nebulaMesh.material as THREE.Material).dispose(); }
      if (t3TubeMesh){ t3TubeMesh.geometry.dispose(); if (t3TubeMat) t3TubeMat.dispose(); }
      if (t3NodeMesh) t3NodeMesh.geometry.dispose();
      if (t3PulseMesh) t3PulseMesh.geometry.dispose();
      if (t3DustMesh){ t3DustMesh.geometry.dispose(); (t3DustMesh.material as THREE.Material).dispose(); }
      if (particleMesh){ particleMesh.geometry.dispose(); (particleMesh.material as THREE.Material).dispose(); if (pulseTex) pulseTex.dispose(); }
      if (trigMesh){ trigMesh.geometry.dispose(); } // material + texture shared with particleMesh, disposed above
      if (bloomPass) bloomPass.dispose();
      composer.dispose?.();
      renderer.dispose();
    }

    applyReducedMotion();

    // seed initial position + first arrival
    sampleSeg(0, camCurves, V, _pos);
    camera.position.copy(_pos);
    lookTarget(0.05, _look);
    camera.lookAt(_look);
    animate();

    return {
      setProgress,
      flyTo,
      pulse(stopIndex?: number){
        const i = stopIndex == null ? currentStop : Math.round(stopIndex);
        if (scheduleTrigger && i >= 1 && i < M) scheduleTrigger(i);
      },
      setReducedMotion,
      resize,
      setPaused,
      getProgress: () => displayProgress,
      getStop: () => (currentStop < 0 ? 0 : currentStop),
      stopCount: () => M,
      dispose,
    };
}
