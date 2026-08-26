/**
 * `content/stops.ts` is the single source of truth for stop identity and layout, and
 * three other things read it: the corpus checker (every memory carries a stopId), the
 * router (a question maps to a stopId), and the renderer (a stopId maps to a compose
 * kind). Nothing else validates it, so a typo here surfaces as a blank section or a
 * memory that can never be reached.
 */
import { describe, expect, it } from 'vitest';
import type { ComposeKind } from '../../content/stops';
import { ANSWERABLE_STOP_IDS, STOPS, STOP_IDS, stopById } from '../../content/stops';

/**
 * The compose kinds the renderer knows how to draw, from the authoritative design in
 * `public/preview.html`. A stop composing anything else renders as nothing.
 *
 * Typed as `ComposeKind[]` deliberately: add a compose kind to STOPS and this list
 * still type-checks (it is a subset), so the runtime assertion below stays the thing
 * that catches it — but delete a kind the renderer still needs and tsc says so.
 */
const RENDERABLE_COMPOSE: readonly ComposeKind[] = ['hero', 'plain', 'cards', 'carousel', 'contact'];

describe('STOPS', () => {
  it('has nine stops', () => {
    expect(STOPS).toHaveLength(9);
    expect(STOP_IDS).toHaveLength(9);
  });

  it('has unique ids', () => {
    expect(new Set(STOP_IDS).size).toBe(STOP_IDS.length);
  });

  it('indexes 0-8, contiguous and in order', () => {
    expect(STOPS.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('opens on hero', () => {
    expect(STOPS[0].id).toBe('hero');
    expect(stopById('hero').index).toBe(0);
  });

  it('never lets a generated answer target hero', () => {
    // hero is authored-only. A model that can route to it can overwrite the one piece
    // of copy nobody reviews on the way past.
    expect(ANSWERABLE_STOP_IDS).not.toContain('hero');
    expect(ANSWERABLE_STOP_IDS).toHaveLength(8);
    expect([...ANSWERABLE_STOP_IDS].sort()).toEqual([...STOP_IDS].filter((id) => id !== 'hero').sort());
  });

  it('composes only what the renderer can draw', () => {
    for (const stop of STOPS) {
      expect(RENDERABLE_COMPOSE, `${stop.id} composes "${stop.compose}"`).toContain(stop.compose);
    }
  });

  it('gives every stop a kicker', () => {
    for (const stop of STOPS) expect(stop.kicker.trim().length).toBeGreaterThan(0);
  });

  it('throws on an unknown id rather than returning undefined', () => {
    expect(() => stopById('nope' as never)).toThrow(/unknown stopId/);
  });
});
