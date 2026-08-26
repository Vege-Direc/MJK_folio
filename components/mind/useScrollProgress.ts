'use client';
import { useEffect, useRef } from 'react';

/** Scroll progress 0..1 across the whole document. Smoothed for camera use. */
export function useScrollProgress() {
  const ref = useRef(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      ref.current += (target - ref.current) * 0.1;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return ref;
}
