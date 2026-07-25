'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import Cortex from './Cortex';

/**
 * WebGL mind — the layer beneath all content.
 *
 * Physics (per Round 3 of the planning memo):
 *   - Camera flight through cortical regions (scroll-linked)
 *   - Activation propagation (pulse on chat query)
 *   - Dendritic sprouting (new question → new filament)
 *   - Myelination (frequent paths thicken, session-persistent via Redis)
 *   - Ambient signal traffic (idle background pulses)
 *
 * The original scroll physics live in reference/original-webgl.html and must be
 * ported into <Cortex/>. The port is intentionally staged — this file mounts the
 * R3F Canvas so app/page.tsx already renders correctly; Cortex renders a minimal
 * placeholder until the port lands.
 *
 * COLOR RULE: filament = --color-filament (cyan). Pulse = --color-pulse (orange).
 * Never mix them with DOM chrome colors.
 */
export default function MindScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 8], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#0a0a0a']} />
      <Suspense fallback={null}>
        <Cortex />
      </Suspense>
    </Canvas>
  );
}
