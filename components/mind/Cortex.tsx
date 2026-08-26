'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  buildWaypoints,
  meanderingCurve,
  growDendrites,
  buildSecondaryNodes,
} from './geometry';
import { useScrollProgress } from './useScrollProgress';
import { useActivation } from './useActivation';

const PALETTE = {
  bg: 0x0a0a0e,
  node: 0x3ecfff,
  tube: 0x2a8fb8,
  pulse: 0xff8a3d,
  particle: 0xbff7ff,
} as const;

/**
 * The cortex — a scroll-linked walk through a pre-formed neural mesh.
 * Physics per Round 3 of the planning memo:
 *   - Camera flies along a CatmullRomCurve3 spine (scroll → t)
 *   - Filaments = meandering curves between spine nodes (tube geometry)
 *   - Secondary nodes branch off the spine (points)
 *   - Dendrites = Galton-Watson binary trees off each secondary node
 *   - Activation pulse — uniform driven by lib/bus.ts (chat query fires here)
 *   - Ambient signal traffic — slow background flicker on random nodes
 */
export default function Cortex() {
  const { size } = useThree();

  // ---------- geometry (memoised — same seed → same cortex) ----------
  const { spineCurve, nodes, dendriteGeom, spineTubeGeom, camCurve } = useMemo(() => {
    const wp = buildWaypoints(12);
    // Camera follows a curve through waypoint POSITIONS; look-at is spine node.
    const camCurve = new THREE.CatmullRomCurve3(wp.map((w) => w.position), false, 'catmullrom', 0.3);

    // Meandering spine — one geometry, many segments.
    const spineSegments: Float32Array[] = [];
    for (let i = 0; i < wp.length - 1; i++) {
      const curve = meanderingCurve(wp[i].lookAt, wp[i + 1].lookAt, i + 1);
      const tube = new THREE.TubeGeometry(curve, 40, 0.045, 6, false);
      const pos = tube.getAttribute('position').array as Float32Array;
      spineSegments.push(new Float32Array(pos));
    }
    const total = spineSegments.reduce((s, a) => s + a.length, 0);
    const merged = new Float32Array(total);
    let off = 0;
    for (const s of spineSegments) { merged.set(s, off); off += s.length; }
    const spineTubeGeom = new THREE.BufferGeometry();
    // Non-indexed tube approximation — we render as points; a proper merge would
    // rebuild indices. For the Cortex we render tubes as thin instanced lines
    // between curve samples, cheaper and matches the reference file's aesthetic.
    const linePts: number[] = [];
    for (let i = 0; i < wp.length - 1; i++) {
      const curve = meanderingCurve(wp[i].lookAt, wp[i + 1].lookAt, i + 1);
      const samples = curve.getPoints(60);
      for (let k = 0; k < samples.length - 1; k++) {
        linePts.push(samples[k].x, samples[k].y, samples[k].z);
        linePts.push(samples[k + 1].x, samples[k + 1].y, samples[k + 1].z);
      }
    }
    spineTubeGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));

    // Secondary nodes (branch off spine).
    const secondary = buildSecondaryNodes(wp, 8);
    const spineNodes = wp.map((w) => w.lookAt);
    const allNodes = [...spineNodes, ...secondary];
    const nodePos = new Float32Array(allNodes.length * 3);
    allNodes.forEach((p, i) => {
      nodePos[i * 3] = p.x; nodePos[i * 3 + 1] = p.y; nodePos[i * 3 + 2] = p.z;
    });
    const nodesGeom = new THREE.BufferGeometry();
    nodesGeom.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));

    // Dendrites off each secondary node.
    const dLines: number[] = [];
    secondary.forEach((p, i) => {
      const segs = growDendrites(p, i * 13 + 3, 3);
      for (const [a, b] of segs) {
        dLines.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    });
    const dendriteGeom = new THREE.BufferGeometry();
    dendriteGeom.setAttribute('position', new THREE.Float32BufferAttribute(dLines, 3));

    return {
      spineCurve: null,
      nodes: nodesGeom,
      dendriteGeom,
      spineTubeGeom,
      camCurve,
    };
  }, []);

  // ---------- scroll → camera position along curve ----------
  const scroll = useScrollProgress();
  const activation = useActivation();
  const timeRef = useRef(0);
  const camTargetTmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock }, dt) => {
    timeRef.current += dt;

    // Smooth scroll interpolation
    const t = THREE.MathUtils.clamp(scroll.current, 0.001, 0.999);
    const pos = camCurve.getPointAt(t);
    const ahead = camCurve.getPointAt(Math.min(0.999, t + 0.02));
    camera.position.lerp(pos, 0.08);
    camTargetTmp.copy(ahead);
    // Nudge lookAt down-and-forward toward the meandering spine
    camTargetTmp.y -= 0.4;
    camera.lookAt(camTargetTmp);
  });

  // ---------- materials with activation uniform ----------
  const nodeMat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uColor: { value: new THREE.Color(PALETTE.node) },
        uAccent: { value: new THREE.Color(PALETTE.pulse) },
        uSize: { value: 12 },
        uDpr: { value: 1 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPulse;
        uniform float uSize;
        uniform float uDpr;
        varying float vExcite;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = length(position) * 0.05;
          float ambient = 0.5 + 0.5 * sin(uTime * 0.6 + d * 6.28);
          vExcite = uPulse + ambient * 0.15;
          gl_PointSize = uSize * uDpr * (1.0 + vExcite * 1.3) * (12.0 / -mv.z);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uAccent;
        varying float vExcite;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uColor, uAccent, clamp(vExcite, 0.0, 1.0));
          gl_FragColor = vec4(col, core * (0.8 + vExcite * 0.2));
        }
      `,
    });
    return m;
  }, []);

  useFrame(({ gl }) => {
    nodeMat.uniforms.uTime.value = timeRef.current;
    nodeMat.uniforms.uPulse.value = activation.pulse;
    nodeMat.uniforms.uDpr.value = gl.getPixelRatio();
  });

  return (
    <>
      <fog attach="fog" args={[PALETTE.bg, 20, 90]} />
      {/* Spine — meandering filaments */}
      <lineSegments geometry={spineTubeGeom}>
        <lineBasicMaterial color={PALETTE.tube} transparent opacity={0.55} />
      </lineSegments>
      {/* Dendrites — thin branching filaments */}
      <lineSegments geometry={dendriteGeom}>
        <lineBasicMaterial color={PALETTE.tube} transparent opacity={0.22} />
      </lineSegments>
      {/* Nodes */}
      <points geometry={nodes} material={nodeMat} />
    </>
  );
}
