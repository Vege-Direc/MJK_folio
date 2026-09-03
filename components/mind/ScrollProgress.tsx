'use client';

import { useEffect } from 'react';
import { getMind } from '@/lib/mind/controller';

/**
 * Document scroll -> scene progress, and nothing in the other direction.
 *
 * The mapping is the one the camera path was built for: `sampleSeg` samples each of the
 * eight camera curves uniformly, so `u = i / 8` lands exactly on vantage i. Stop i in
 * view therefore has to mean `u = i / 8`, which is what measuring against each section's
 * own `offsetTop` gives — and it keeps being true when a section grows past a viewport
 * on a phone, which the naive `scrollY / (scrollHeight - innerHeight)` does not.
 *
 * Smoothing is deliberately not done here. The scene already eases displayProgress
 * toward the pushed value at `1 - exp(-8·dt)`, framerate-independently; a second filter
 * in front of it would only add latency to the same curve.
 *
 * `data-stop` on <html> is the lit-stop marker. It is computed from scroll rather than
 * from the scene's arrival callback so that a machine with no WebGL still gets it.
 */
export default function ScrollProgress({ count }: { count: number }) {
  useEffect(() => {
    if (count < 2) return;
    const root = document.documentElement;

    /**
     * The scroll position at which each stop is fully arrived at, measured once and on
     * resize — never per frame.
     *
     * The last one is the bottom of the page, not the last section's top: a section is
     * a viewport tall, so its top is the last thing you can scroll to only when nothing
     * follows it. On a phone, where a stop is allowed to grow past a viewport and the
     * page carries dock padding, they differ by that tail.
     */
    let marks: number[] = [];
    let sections: HTMLElement[] = [];

    function measure() {
      sections = Array.from(document.querySelectorAll<HTMLElement>('section[data-stop]'));
      const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
      marks = sections.map((el) => el.offsetTop);
      if (marks.length) marks[marks.length - 1] = maxScroll;
    }

    /** Where we are, in 0..1 over the stops, from the segment we are inside. */
    function progress(): number {
      if (marks.length < 2) return 0;
      const y = window.scrollY;
      let seg = 0;
      while (seg < marks.length - 2 && y >= marks[seg + 1]) seg++;
      const span = Math.max(1, marks[seg + 1] - marks[seg]);
      const local = Math.min(1, Math.max(0, (y - marks[seg]) / span));
      return Math.min(1, (seg + local) / (marks.length - 1));
    }

    let queued = false;
    let lastStop = -1;
    let scrolled = false;

    function apply() {
      queued = false;
      const u = progress();
      getMind()?.setProgress(u);

      const stop = Math.min(count - 1, Math.max(0, Math.round(u * (count - 1))));
      if (stop !== lastStop) {
        lastStop = stop;
        root.dataset.stop = String(stop);
        // The lit-stop affordance (preview.html:30-46), set on the section itself: CSS
        // cannot compare an attribute on <html> against one on a descendant, and nine
        // hard-coded id pairs would be nine chances to mistype a stop id.
        for (const el of sections) {
          el.dataset.active = el.dataset.stop === String(stop) ? 'true' : 'false';
        }
      }
      if (!scrolled && u > 0.005) {
        scrolled = true;
        root.dataset.scrolled = 'true';
      }
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    }

    function onResize() {
      measure();
      onScroll();
    }

    measure();
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // Sections are 100svh; the fonts landing changes nothing, but an image or a late
    // stylesheet can, so re-measure once the page has settled.
    const settle = setTimeout(onResize, 400);

    /*
     * Sections change height without the window ever resizing, and the mapping has to
     * follow them.
     *
     * `marks` used to be measured at mount and refreshed only on `resize`. An answer
     * streaming into a stop moved that stop's offset by 1,268px on a phone and fired no
     * resize at all, so every mark below it was wrong for the rest of the visit and the
     * camera ran against stale geometry. It matters more now that a desktop panel is also
     * allowed to grow when it holds an answer.
     *
     * Measuring reads layout and writes none, so observing the same elements it measures
     * cannot loop. The rAF coalesces the burst a streaming answer produces into one
     * measurement per frame.
     */
    let pending = 0;
    const remeasure = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        onResize();
      });
    };
    const ro = new ResizeObserver(remeasure);
    for (const el of sections) ro.observe(el);

    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(pending);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [count]);

  return null;
}
