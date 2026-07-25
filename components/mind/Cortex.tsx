'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Placeholder cortex — a slow-drifting point field in filament cyan.
 * The full port of reference/original-webgl.html (nodes + connective tissue +
 * scroll-linked camera path) will replace this file. Keep the API identical:
 * a self-contained <Cortex/> that renders inside <MindScene/>'s <Canvas>.
 */
export default function Cortex() {
  const ref = useRef<THREE.Points>(null);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 3000;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.035} color={'#4dd4e8'} transparent opacity={0.75} sizeAttenuation />
    </points>
  );
}
