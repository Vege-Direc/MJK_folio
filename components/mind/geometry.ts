import * as THREE from 'three';

// Deterministic PRNG — same seed → same cortex across reloads/SSR/CSR.
export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Waypoint = { position: THREE.Vector3; lookAt: THREE.Vector3 };

/**
 * Build a scroll spine of waypoints. Each waypoint has a lookAt (the featured
 * spine node) and a camera position offset from it. Mirrors the reference file's
 * approach where V = S + up.
 */
export function buildWaypoints(count: number, seed = 42): Waypoint[] {
  const rng = mulberry32(seed);
  const pts: Waypoint[] = [];
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < count; i++) {
    // Meandering spine: gentle drift on x/y, monotonic advance on z.
    x += (rng() - 0.5) * 6;
    y += (rng() - 0.5) * 3;
    z -= 8 + rng() * 3;
    const lookAt = new THREE.Vector3(x, y, z);
    // Camera vantage: back off along -z, slight upward tilt.
    const position = lookAt.clone().add(new THREE.Vector3((rng() - 0.5) * 1.5, 1.4, 6.5));
    pts.push({ position, lookAt });
  }
  return pts;
}

/**
 * Multi-scale tortuosity: build a CatmullRomCurve3 that MEANDERS between A and B,
 * not a smooth arc. Offsets depend on (dir, len, seed) only — deterministic per edge.
 */
export function meanderingCurve(A: THREE.Vector3, B: THREE.Vector3, seed: number) {
  const dir = new THREE.Vector3().subVectors(B, A);
  const len = dir.length();
  dir.normalize();
  const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const perp1 = new THREE.Vector3().crossVectors(dir, up).normalize();
  const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();

  const rng = mulberry32(Math.floor(seed * 1000));
  const N = 6;
  const pts: THREE.Vector3[] = [A.clone()];
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const base = A.clone().addScaledVector(dir, len * t);
    const s1 = (rng() - 0.5) * len * 0.14;
    const s2 = (rng() - 0.5) * len * 0.08;
    const s3 = (rng() - 0.5) * len * 0.04;
    base.addScaledVector(perp1, s1 + s3);
    base.addScaledVector(perp2, s2);
    pts.push(base);
  }
  pts.push(B.clone());
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
}

/**
 * Galton-Watson binary dendrites — grow a stochastic tree from each root node.
 * bifurcation ratio ~3.4 in real cortex (Vormberg et al. 2017).
 */
export function growDendrites(root: THREE.Vector3, seed: number, maxDepth = 4): THREE.Vector3[][] {
  const rng = mulberry32(seed);
  const segments: THREE.Vector3[][] = [];
  function branch(from: THREE.Vector3, dir: THREE.Vector3, depth: number) {
    if (depth > maxDepth) return;
    const len = (1.6 / (depth + 1)) * (0.6 + rng() * 0.8);
    const to = from.clone().addScaledVector(dir, len);
    segments.push([from, to]);
    if (rng() < 0.7 - depth * 0.12) {
      const swing = (Math.PI / 6) * (1 + rng());
      const a1 = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), swing);
      const a2 = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -swing);
      a1.applyAxisAngle(new THREE.Vector3(1, 0, 0), (rng() - 0.5) * 0.6).normalize();
      a2.applyAxisAngle(new THREE.Vector3(1, 0, 0), (rng() - 0.5) * 0.6).normalize();
      branch(to, a1, depth + 1);
      branch(to, a2, depth + 1);
    }
  }
  // Two initial trunks in perpendicular directions
  const seedDir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
  branch(root, seedDir, 0);
  branch(root, seedDir.clone().negate(), 0);
  return segments;
}

/** Secondary nodes: branched off spine, ambient density. */
export function buildSecondaryNodes(waypoints: Waypoint[], perNode = 6, seed = 7): THREE.Vector3[] {
  const rng = mulberry32(seed);
  const out: THREE.Vector3[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 1; i < waypoints.length - 1; i++) {
    const S = waypoints[i].lookAt;
    const dir = waypoints[i + 1].lookAt.clone().sub(S).normalize();
    let perp = new THREE.Vector3().crossVectors(dir, up);
    if (perp.lengthSq() < 1e-4) perp.set(1, 0, 0);
    perp.normalize();
    const up2 = new THREE.Vector3().crossVectors(dir, perp).normalize();
    for (let j = 0; j < perNode; j++) {
      const ang = rng() * Math.PI * 2;
      const r = 1.8 + rng() * 3.6;
      const p = S.clone()
        .addScaledVector(perp, Math.cos(ang) * r)
        .addScaledVector(up2, Math.sin(ang) * r);
      out.push(p);
    }
  }
  return out;
}
