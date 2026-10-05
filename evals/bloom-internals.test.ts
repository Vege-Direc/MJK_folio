import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BloomPyramidPass, bloomInternalsIntact } from '../lib/mind/bloom';

/**
 * `BloomPyramidPass` reproduces three.js r169's `UnrealBloomPass.render()` minus its final
 * additive blend, so that `ReadingLightOutputPass` can add the bloom while it is already
 * reading the frame. That saves a full-screen pass — 740,610 device pixels on a 390x664
 * phone — and it is version-coupled code.
 *
 * `package.json` pins three to an exact 0.169.0, and `scene.ts` falls back to the stock
 * pass if `bloomInternalsIntact()` returns false, so the worst case is a slower frame
 * rather than a broken one. This test is the third guard: it fails in CI on a three.js
 * upgrade that moves any of it, instead of letting someone find out from a screenshot.
 */
describe('bloom pyramid internals (three.js r169)', () => {
  it('is running the three.js revision this code was written against', () => {
    expect(THREE.REVISION).toBe('169');
  });

  it('pins three EXACTLY, so an install cannot drift the internals under us', async () => {
    const { readFile } = await import('node:fs/promises');
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    // No caret, no tilde: a range here would let `npm install` move the internals
    // BloomPyramidPass reproduces without anything failing until a phone screenshot.
    expect(pkg.dependencies.three).toBe('0.169.0');
  });

  it('exposes every internal BloomPyramidPass.render() reaches into', () => {
    const pass = new BloomPyramidPass(new THREE.Vector2(64, 64), 0.45, 0.85, 0.6);
    expect(bloomInternalsIntact(pass)).toBe(true);
    pass.dispose();
  });

  it('rejects a pass whose internals have moved, so the fallback engages', () => {
    const pass = new BloomPyramidPass(new THREE.Vector2(64, 64), 0.45, 0.85, 0.6);
    const held = pass as unknown as { compositeMaterial: unknown };
    const real = held.compositeMaterial;
    held.compositeMaterial = undefined;
    expect(bloomInternalsIntact(pass)).toBe(false);
    held.compositeMaterial = real;   // put it back; dispose() needs it
    pass.dispose();
  });

  it('still keeps needsSwap false, which is what makes it a drop-in', () => {
    const stock = new UnrealBloomPass(new THREE.Vector2(64, 64), 0.45, 0.85, 0.6);
    const ours = new BloomPyramidPass(new THREE.Vector2(64, 64), 0.45, 0.85, 0.6);
    expect(ours.needsSwap).toBe(stock.needsSwap);
    expect(ours.needsSwap).toBe(false);
    stock.dispose();
    ours.dispose();
  });

  it('hands out the composite target the stock pass would have blended', () => {
    const pass = new BloomPyramidPass(new THREE.Vector2(64, 64), 0.45, 0.85, 0.6);
    const rts = (pass as unknown as { renderTargetsHorizontal: THREE.WebGLRenderTarget[] }).renderTargetsHorizontal;
    expect(pass.bloomTexture).toBe(rts[0].texture);
    pass.dispose();
  });
});
