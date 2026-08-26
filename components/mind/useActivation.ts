'use client';
import { useEffect, useState, useRef } from 'react';
import { on } from '@/lib/bus';

/** Listens for section:activate → pulses briefly. Fades over ~1.5s. */
export function useActivation() {
  const pulseRef = useRef(0);
  const [, force] = useState(0);
  useEffect(() => {
    const off = on('section:activate', () => {
      pulseRef.current = 1;
    });
    let raf = 0;
    const tick = () => {
      pulseRef.current *= 0.965;
      if (pulseRef.current < 0.001) pulseRef.current = 0;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { off(); cancelAnimationFrame(raf); };
  }, []);
  return { pulse: pulseRef.current };
}
