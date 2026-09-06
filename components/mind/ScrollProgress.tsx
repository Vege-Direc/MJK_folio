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
/**
 * The alarm §2.3 did not have, and the only place all three numbers meet.
 *
 * `count` arrives from `app/page.tsx` as `STOPS.length`, the sections come from the DOM
 * the same file rendered, and `stopCount()` is the length of the camera path
 * `MindCanvas` handed the scene. Three independent paths out of one stop table, and
 * nothing used to compare them: when the scene was hard-coded to nine and `STOPS` grew,
 * this component would have mapped every section onto an eight-segment camera path and
 * been wrong for the whole back half of the page without raising anything.
 *
 * Development only. `process.env.NODE_ENV` is a build-time constant here, so the whole
 * block is eliminated from the production bundle and cannot take the site down for a
 * visitor — a disagreement in production is still better served by a slightly wrong
 * camera than by a blank page.
 */
const DEV = process.env.NODE_ENV !== 'production';

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

    /** Set once the scene has been checked, so one disagreement is not one throw per frame. */
    let checkedMind: ReturnType<typeof getMind> = null;

    function measure() {
      sections = Array.from(document.querySelectorAll<HTMLElement>('section[data-stop]'));
      if (DEV && sections.length !== count) {
        throw new Error(
          `[mind] ${sections.length} sections carry data-stop but content/stops.ts has ${count}. ` +
            'The scroll mapping is measured against these sections, so the two must agree.',
        );
      }
      const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
      marks = sections.map((el) => el.offsetTop);
      /*
       * The last mark is the smaller of the last section's top and the furthest the
       * document can scroll — and the `min` is the whole of the fix.
       *
       * This line used to be `marks[last] = maxScroll` unconditionally, defended by "a
       * section is a viewport tall, so its top is the last thing you can scroll to only
       * when nothing follows it". That premise is true on a desktop and false on a phone.
       * Measured on the production build at 1440x900, `contact` sits at offsetTop 7200
       * and maxScroll is 7200 — identical, so the old line was a no-op there. At 390x664
       * `contact` sits at 7820 and maxScroll is 8299, because below 900px `.panel` is
       * `height: auto` and the section is 1,136px tall inside a 664px viewport.
       *
       * That 479px tail was being added to the FINAL segment only. It ran 6658 -> 8299
       * instead of 6658 -> 7820: 41% longer than every other segment, so the camera
       * crossed it 29% slower and reached the last vantage at the absolute bottom of the
       * document rather than when `contact` reached the top of the screen. Every earlier
       * stop was correct, because both ends of those segments are `offsetTop`. MJK: "the
       * scroll end is not mapped properly on mobile".
       *
       * With the `min`, `local` clamps to 1 for the length of the tail, so the camera
       * arrives with the section and then HOLDS while the visitor reads the rest of it,
       * which is the behaviour every other stop already had.
       *
       * The `min` is not decoration. When the last section is SHORTER than the viewport
       * its top is past the end of the scrollable range, and then `maxScroll` really is
       * the last reachable position — which is the case the original line was written
       * for, and the only case where it was right.
       */
      if (marks.length) marks[marks.length - 1] = Math.min(marks[marks.length - 1], maxScroll);
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
      const mind = getMind();
      mind?.setProgress(u);

      /*
       * Asked once per scene instance, not once per frame. The scene mounts from an
       * idle callback and then a dynamic import, so it is not there when this effect
       * runs and there is no single later moment to ask — but asking every frame would
       * turn one disagreement into one uncaught exception per frame.
       */
      if (DEV && mind && mind !== checkedMind) {
        checkedMind = mind;
        if (mind.stopCount() !== count) {
          throw new Error(
            `[mind] the camera path has ${mind.stopCount()} vantages and content/stops.ts has ` +
              `${count} stops. MindCanvas builds the path from STOPS.length, so this means ` +
              'something else is passing MindOptions.waypoints.',
          );
        }
      }

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
