/**
 * Curve construction. `makeCurve` is transcribed from `reference/preview.html:403-439`
 * and `tubeWithTangent` from `:913-937`, unchanged apart from type annotations.
 *
 * `makeCurve` is deliberately NOT refactored. Its constraint — offsets depend on
 * (dir, len, seed) only, never on absolute A/B — is what makes `makeCurve(V[i], V[i+1], s)`
 * the same meander as `makeCurve(S[i], S[i+1], s)` when V = S + up. That identity is the
 * reason the camera flies along the visible axon instead of near it, and it is destroyed
 * by any "simplification" that reaches for the endpoints.
 */
import * as THREE from 'three';
import { srand } from './waypoints';

export const UP = new THREE.Vector3(0, 1, 0);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Multi-scale tortuosity: real dendrites and axons MEANDER across multiple scales
 * (Wen & Chklovskii 2008). A single quadratic bend reads as one smooth arc; real
 * neurites wander. Lay N intermediate waypoints along A->B, each offset perpendicular
 * to the curve direction by srand-based amounts at decreasing scale, then build a
 * CatmullRomCurve3 through them => organic wandering at multiple frequencies, not a
 * single bow.
 *
 * CONSTRAINT: offsets depend on (dir, len, seed) ONLY, never absolute A/B, so
 * makeCurve(S[i],S[i+1],seed) and makeCurve(V[i],V[i+1],seed) (V=S+up) produce the
 * IDENTICAL meander (dir identical => perp1/perp2 identical => offsets identical)
 * => the camera curve is the tube curve shifted up => the camera still travels ALONG
 * the axon. No absolute-position noise (that would desync camera from tube).
 */
export function makeCurve(a: THREE.Vector3, b: THREE.Vector3, seed: number): THREE.CatmullRomCurve3 {
  const dir = b.clone().sub(a);
  const len = dir.length() || 1;
  const nrm = dir.clone().normalize();
  let perp1 = new THREE.Vector3().crossVectors(nrm, UP);
  if (perp1.lengthSq() < 1e-4) perp1 = new THREE.Vector3(1, 0, 0);
  perp1.normalize();
  const perp2 = new THREE.Vector3().crossVectors(nrm, perp1).normalize();
  const pts = [a.clone()];
  const N = 4;
  const maxBend = Math.min(len * 0.16, 1.7);
  for (let k = 1; k <= N; k++) {
    const t = k / (N + 1);
    const p = a.clone().addScaledVector(dir, t);
    // decreasing-scale offsets: coarse wander (low k) + fine jitter (high k)
    const scale = 1.0 / (0.6 + k * 0.7);
    const amp = maxBend * scale * (0.45 + srand(seed + k * 7.3) * 0.9);
    const ang = srand(seed + k * 3.1) * Math.PI * 2;
    p.addScaledVector(perp1, Math.cos(ang) * amp * (0.4 + srand(seed + k * 11.7) * 0.7));
    p.addScaledVector(perp2, Math.sin(ang) * amp * (0.4 + srand(seed + k * 13.3) * 0.7));
    pts.push(p);
  }
  pts.push(b.clone());
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

/**
 * A tube along `curve` carrying per-vertex curve-tangent + sway params, so the filament
 * shader can detect axial (down-the-barrel) views AND bend organically.
 *
 * Sway is baked as a per-vertex phase + amplitude = lerp(rootNodeSway, tipNodeSway, u).
 * The root vertex (u=0) gets the parent node's (phase, amp) and the tip vertex (u=1) the
 * child node's — so a tube endpoint and its node share the exact same sway params =>
 * identical displacement => NO detachment, while the branch bends between them (amp
 * grows root->tip). Spine axons connect two amp-0 spine nodes => no sway, so the camera
 * path stays stable.
 *
 * TubeGeometry lays out verts as (tub+1)*(rad+1); tangent + sway are constant across
 * each ring, sampled at u = i/tub.
 */
export function tubeWithTangent(
  curve: THREE.Curve<THREE.Vector3>,
  tubSeg: number,
  radius: number,
  radSeg: number,
  rootSway: [number, number] | number[],
  tipSway: [number, number] | number[],
): THREE.TubeGeometry {
  const g = new THREE.TubeGeometry(curve, tubSeg, radius, radSeg, false);
  const rad = radSeg + 1;
  const n = (tubSeg + 1) * rad;
  const arr = new Float32Array(n * 3);
  const ph = new Float32Array(n);
  const am = new Float32Array(n);
  const rP = rootSway[0], rA = rootSway[1], tP = tipSway[0], tA = tipSway[1];
  for (let i = 0; i <= tubSeg; i++) {
    const u = tubSeg === 0 ? 0 : i / tubSeg;
    const t = curve.getTangentAt(u); // normalized, arc-length uniform, matches TubeGeometry frames
    const sp = rP + (tP - rP) * u; // lerp phase root->tip
    const sa = rA + (tA - rA) * u; // lerp amplitude root->tip (grows => branch bends)
    for (let j = 0; j <= radSeg; j++) {
      const idx = (i * rad + j) * 3;
      arr[idx] = t.x;
      arr[idx + 1] = t.y;
      arr[idx + 2] = t.z;
      ph[i * rad + j] = sp;
      am[i * rad + j] = sa;
    }
  }
  g.setAttribute('tangent', new THREE.BufferAttribute(arr, 3));
  g.setAttribute('aSwayPhase', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSwayAmp', new THREE.BufferAttribute(am, 1));
  return g;
}
