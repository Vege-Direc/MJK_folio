'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import Cortex from './Cortex';

/**
 * WebGL mind — fixed layer beneath all content. Never destroyed, only observed.
 * Camera flies along a scroll-linked CatmullRomCurve3 through the cortex.
 * Chat activation fires an orange pulse via lib/bus.ts → useActivation.
 */
export default function MindScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 12], fov: 55, near: 0.1, far: 400 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0a0a0e']} />
      <Suspense fallback={null}>
        <Cortex />
      </Suspense>
    </Canvas>
  );
}
