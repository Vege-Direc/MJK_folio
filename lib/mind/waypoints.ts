/**
 * The nine camera vantages and the nine spine nodes they look at, plus the two seeded
 * generators every other piece of geometry in the scene derives from.
 *
 * Lifted verbatim from `reference/preview.html:389-401` (`mulberry32`, `srand`) and
 * `:2128-2149` (`buildWaypoints`). The seed `20260723` is load-bearing: change it and
 * every filament, node cluster and dust mote in the scene moves.
 */
import * as THREE from 'three';

/** One stop: where the camera sits, and the spine node it faces. */
export type Waypoint = { position: [number, number, number]; lookAt: [number, number, number] };

/** Bruce Forstall's mulberry32. Deterministic, 32-bit, fast enough to call per-vertex. */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stateless hash-noise: the same seed always yields the same number, in any order. */
export const srand = (s: number): number => {
  const x = Math.sin(s * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The spine, and the camera vantages above it.
 *
 * `V[0]` is pulled 15 units back along the first segment and 6 up so the opening frame
 * looks down the length of the network rather than starting inside it. Every other
 * vantage is its spine node plus `(0, 1.4, 0)` — a pure translation, which is the whole
 * trick: because `makeCurve`'s offsets depend only on direction, length and seed, the
 * camera curve is the axon curve shifted up, so the flight reads as travelling *inside*
 * the network rather than alongside a parallel track.
 */
export function buildWaypoints(n: number): Waypoint[] {
  const rng = mulberry32(20260723);
  const S: THREE.Vector3[] = [];
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < n; i++) {
    x += Math.sin(i * 0.9 + 0.4) * 1.8 + (rng() - 0.5) * 1.3;
    y += Math.cos(i * 0.62 + 0.2) * 1.3 + (rng() - 0.5) * 1.0;
    z -= 9 + rng() * 2.5;
    S.push(new THREE.Vector3(x, y, z));
  }
  const dir0 = S[1].clone().sub(S[0]).normalize();
  const dirN = S[n - 1].clone().sub(S[n - 2]).normalize();
  const V = S.map((p, i) => {
    if (i === 0) return p.clone().addScaledVector(dir0, -15).add(new THREE.Vector3(0, 6, 0));
    /*
     * The last vantage gets the same treatment as the first, and for the same reason at
     * the other end of the flight.
     *
     * Every interior stop sits 1.4 above its spine node with the next node ahead of it,
     * so the featured soma is something the camera is travelling *towards*. There is no
     * next node at the ninth, so the camera came to rest 1.4 units off the terminal soma
     * and filled the frame with it: `contact` measured a whole-frame luminance of 127.6
     * against 92.2 for every other stop, a pale cyan wash from edge to edge. That is the
     * one screen a visitor is asked to act on, and it read as a different website — and
     * the reading light, which weights itself toward one side of the frame, had nothing
     * to weight toward.
     *
     * Nine units back is one segment's worth: it puts the last soma at the distance the
     * other eight are seen from, and keeps `lookAt` on it so the stop still has a
     * subject.
     */
    if (i === n - 1) return p.clone().addScaledVector(dirN, -9).add(new THREE.Vector3(0, 1.4, 0));
    return p.clone().add(new THREE.Vector3(0, 1.4, 0));
  });
  return S.map((p, i) => ({
    position: V[i].toArray() as [number, number, number],
    lookAt: p.toArray() as [number, number, number],
  }));
}
