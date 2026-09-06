/**
 * The camera path has to have as many vantages as `content/stops.ts` has stops, and
 * until this file existed nothing checked that it did.
 *
 * `createMind` used to default `opts.waypoints` to `buildWaypoints(9)` and `MindCanvas`
 * never passed one, so the literal nine was the scene whatever `STOPS` held. Every way
 * that could go wrong was silent: `ScrollProgress` maps `n` sections onto the camera's
 * `M - 1` segments and would simply have been wrong for the whole back half of the page,
 * `pulse(i)` is guarded `i >= 1 && i < M` and drops an out-of-range stop without a word,
 * and `textSides` past the last vantage is never read. A wrong number, three quiet
 * failures, and no test.
 *
 * The type system now carries most of it — `waypoints` is required, so omitting it is a
 * compile error — and this file carries the rest: that what `MindCanvas` builds and what
 * the scene reports are both `STOPS.length`, and that neither the scene nor the flight
 * clamp has grown a fresh literal in the meantime.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STOPS } from '../../content/stops';
import { buildWaypoints } from '../../lib/mind/waypoints';
import { createMind } from '../../lib/mind/scene';

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

/**
 * The same source with its comments taken out. Every file below explains the defect it
 * used to have by quoting it, so a scan for `buildWaypoints(9)` over the raw text finds
 * the explanation and calls it the bug. The `[^:]` guard keeps `https://` intact.
 */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('the camera path and the stop table', () => {
  it('gives every stop a vantage and a spine node', () => {
    const waypoints = buildWaypoints(STOPS.length);
    expect(waypoints).toHaveLength(STOPS.length);
    for (const w of waypoints) {
      expect(w.position).toHaveLength(3);
      expect(w.lookAt).toHaveLength(3);
      for (const c of [...w.position, ...w.lookAt]) expect(Number.isFinite(c)).toBe(true);
    }
  });

  /**
   * No WebGL and no DOM here, and none is needed. `createMind` reads
   * `canvas.ownerDocument.defaultView` and returns `inertHandle(M)` when there is none,
   * having already computed `M` from the waypoints it was handed — so the handle a
   * machine without WebGL gets reports the same stop count as the one that draws, and
   * that count is reachable from a node test.
   */
  it('reports the stop count the page renders, not a number of its own', () => {
    const canvas = { ownerDocument: { defaultView: null } } as unknown as HTMLCanvasElement;
    const handle = createMind(canvas, { waypoints: buildWaypoints(STOPS.length) });
    expect(handle.stopCount()).toBe(STOPS.length);
    handle.dispose();
  });

  it('has no stop count written into the scene', () => {
    // `buildWaypoints(<number>)` anywhere in the scene is the defect this replaced.
    expect(code('lib/mind/scene.ts')).not.toMatch(/buildWaypoints\(\s*\d/);
  });

  it('builds the path in MindCanvas from the stop table', () => {
    const src = code('components/mind/MindCanvas.tsx');
    expect(src).toMatch(/waypoints:\s*buildWaypoints\(STOPS\.length\)/);
    expect(src).not.toMatch(/buildWaypoints\(\s*\d/);
  });
});

/**
 * The assertions themselves are in client components that this node suite cannot
 * render, so what is checked here is that they are still there and still gated. A
 * source scan is the weaker instrument, and it is the one that fits: an alarm someone
 * quietly deletes is the same failure class the alarm was added for.
 */
describe('the development alarm', () => {
  it('compares the sections, the stop table and the camera path, and throws', () => {
    const src = code('components/mind/ScrollProgress.tsx');
    expect(src).toMatch(/const DEV = process\.env\.NODE_ENV !== 'production'/);
    expect(src).toMatch(/DEV && sections\.length !== count/);
    expect(src).toMatch(/DEV && mind && mind !== checkedMind/);
    expect(src.match(/throw new Error/g) ?? []).toHaveLength(2);
  });

  it('says so when a pulse lands outside the camera path, instead of dropping it', () => {
    const src = code('lib/mind/scene.ts');
    expect(src).toMatch(/process\.env\.NODE_ENV !== 'production' && \(i < 0 \|\| i >= M\)/);
  });

  it('warns rather than throws inside the scene, which the chat calls', () => {
    // `pulse()` runs from the `mjk:route` listener. An exception there would take the
    // answer down with it, so the scene's only remaining throw is the far-network fetch
    // it has always had — a rejected promise the scene already swallows.
    const throws = code('lib/mind/scene.ts').match(/throw new Error/g) ?? [];
    expect(throws).toHaveLength(1);
    expect(code('lib/mind/scene.ts')).toMatch(/if \(!r\.ok\) throw new Error/);
  });
});

describe('the flight clamp', () => {
  /**
   * The clamp is saturated: the hero -> contact flight asks for 948ms at nine stops and
   * gets the ceiling instead, so peak velocity rises linearly with the number of stops.
   * Deriving it from `STOPS` is what stops a longer page from flying faster.
   */
  it('is derived from the stop table rather than written down', () => {
    const src = code('lib/flight.ts');
    expect(src).toMatch(/STOPS\.length/);
    expect(src).toMatch(/Math\.min\(MAX_MS,/);
    // The literal this replaced. It still appears in the prose above; not in the code.
    expect(src).not.toMatch(/Math\.min\(\s*820\b/);
  });

  it('is exactly 820ms at nine stops, so today nothing moves', () => {
    // The bit pattern, not the printed decimal: 820 * 8 / 8 has to BE 820, not round to it.
    expect(Object.is((820 * (STOPS.length - 1)) / 8, 820)).toBe(true);
  });
});
