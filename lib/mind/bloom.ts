import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * `UnrealBloomPass` with its last step removed, so the bloom can be added by the pass that
 * was already going to read the whole frame anyway.
 *
 * WHY THIS EXISTS. The stock chain is three full-screen-sized operations, not two:
 *
 *   RenderPass    scene            -> RT          (740,610 device px on a 390x664 phone)
 *   BloomPass     pyramid          -> its own RTs (96,648 px at half resolution)
 *   BloomPass     RT += bloom      -> RT          (740,610 px)   <- this one
 *   OutputPass    RT -> screen     -> screen      (740,610 px)
 *
 * The third and fourth read and write the same buffer one after the other, and only one of
 * them needs to exist. Removing the additive blend and having `ReadingLightOutputPass` add
 * the bloom texture while it is already holding the texel takes this tier's unconditional
 * full-screen fill from 2.13 frames to 1.13 — bloom for +13% of fill rather than +113%.
 * On a phone, which is fill-bound long before it is ALU-bound, that is the difference
 * between bloom being affordable and not.
 *
 * WHY IT IS SAFE ENOUGH. `render()` below reproduces r169's, minus the final blend. That
 * is version-coupled code and it is here rather than in `scene.ts` so it is obvious what
 * it is. Three things bound the risk:
 *
 *  1. `package.json` pins three to an EXACT `0.169.0` — no caret — so this cannot drift
 *     under a routine `npm install`.
 *  2. `bloomInternalsIntact()` checks every field this file reaches into, and `scene.ts`
 *     falls back to the stock pass plus a stock output pass if any of them has moved. The
 *     failure mode is the old, slower, correct chain — never a broken picture.
 *  3. `evals/bloom-internals.test.ts` asserts the same shape, so a three.js upgrade fails
 *     in CI rather than in a phone screenshot.
 *
 * If a future three.js moves these, delete this file and pass `bloomPass` to the composer
 * the ordinary way. Everything still works; the frame just costs a pass more.
 */

/**
 * r169 declares these as statics on `UnrealBloomPass` but ships no types for them, so
 * they are restated rather than reached for. Verified against
 * `UnrealBloomPass.js:412-413`, which reads:
 *
 *   UnrealBloomPass.BlurDirectionX = new Vector2( 1.0, 0.0 );
 *   UnrealBloomPass.BlurDirectionY = new Vector2( 0.0, 1.0 );
 */
const BLUR_X = new THREE.Vector2(1, 0);
const BLUR_Y = new THREE.Vector2(0, 1);

/** Every internal `render()` below touches. Checked before the subclass is trusted. */
export function bloomInternalsIntact(p: UnrealBloomPass): boolean {
  const a = p as unknown as Record<string, unknown>;
  return (
    typeof a.nMips === 'number' &&
    Array.isArray(a.renderTargetsHorizontal) &&
    Array.isArray(a.renderTargetsVertical) &&
    Array.isArray(a.separableBlurMaterials) &&
    (a.renderTargetsHorizontal as unknown[]).length === a.nMips &&
    (a.renderTargetsVertical as unknown[]).length === a.nMips &&
    (a.separableBlurMaterials as unknown[]).length === a.nMips &&
    !!a.renderTargetBright &&
    !!a.materialHighPassFilter &&
    !!a.compositeMaterial &&
    !!a.highPassUniforms &&
    !!a.fsQuad &&
    !!a._oldClearColor &&
    !!a.clearColor
  );
}

export class BloomPyramidPass extends UnrealBloomPass {
  /** The composited bloom, at the pyramid's own resolution. Sampled by the output pass. */
  get bloomTexture(): THREE.Texture {
    return (this as unknown as { renderTargetsHorizontal: THREE.WebGLRenderTarget[] })
      .renderTargetsHorizontal[0].texture;
  }

  /**
   * r169's `UnrealBloomPass.render()`, verbatim, up to but not including "Blend it
   * additively over the input texture". The result is left in
   * `renderTargetsHorizontal[0]` exactly as the stock pass leaves it before blending.
   *
   * `needsSwap` is already false on the base class, so the composer keeps handing the same
   * buffer to the next pass — which is what makes this a drop-in.
   */
  override render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    const self = this as unknown as {
      _oldClearColor: THREE.Color; oldClearAlpha: number; clearColor: THREE.Color;
      highPassUniforms: Record<string, { value: unknown }>;
      materialHighPassFilter: THREE.ShaderMaterial;
      renderTargetBright: THREE.WebGLRenderTarget;
      nMips: number;
      separableBlurMaterials: THREE.ShaderMaterial[];
      renderTargetsHorizontal: THREE.WebGLRenderTarget[];
      renderTargetsVertical: THREE.WebGLRenderTarget[];
      compositeMaterial: THREE.ShaderMaterial;
      fsQuad: { material: THREE.Material; render: (r: THREE.WebGLRenderer) => void };
      strength: number; radius: number; threshold: number;
      bloomTintColors: THREE.Vector3[];
    };

    renderer.getClearColor(self._oldClearColor);
    self.oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(self.clearColor, 0);

    // 1. extract bright areas
    self.highPassUniforms.tDiffuse.value = readBuffer.texture;
    self.highPassUniforms.luminosityThreshold.value = self.threshold;
    self.fsQuad.material = self.materialHighPassFilter;
    renderer.setRenderTarget(self.renderTargetBright);
    renderer.clear();
    self.fsQuad.render(renderer);

    // 2. blur the mips progressively
    let input = self.renderTargetBright;
    for (let i = 0; i < self.nMips; i++) {
      self.fsQuad.material = self.separableBlurMaterials[i];
      self.separableBlurMaterials[i].uniforms.colorTexture.value = input.texture;
      self.separableBlurMaterials[i].uniforms.direction.value = BLUR_X;
      renderer.setRenderTarget(self.renderTargetsHorizontal[i]);
      renderer.clear();
      self.fsQuad.render(renderer);

      self.separableBlurMaterials[i].uniforms.colorTexture.value = self.renderTargetsHorizontal[i].texture;
      self.separableBlurMaterials[i].uniforms.direction.value = BLUR_Y;
      renderer.setRenderTarget(self.renderTargetsVertical[i]);
      renderer.clear();
      self.fsQuad.render(renderer);

      input = self.renderTargetsVertical[i];
    }

    // 3. composite the mips
    self.fsQuad.material = self.compositeMaterial;
    self.compositeMaterial.uniforms.bloomStrength.value = self.strength;
    self.compositeMaterial.uniforms.bloomRadius.value = self.radius;
    self.compositeMaterial.uniforms.bloomTintColors.value = self.bloomTintColors;
    renderer.setRenderTarget(self.renderTargetsHorizontal[0]);
    renderer.clear();
    self.fsQuad.render(renderer);

    // 4. NOT DONE HERE, and the whole point of this class: the stock pass would now draw
    //    renderTargetsHorizontal[0] additively over readBuffer, full screen.
    //    ReadingLightOutputPass adds it instead, in the pass that already reads the frame.

    renderer.setClearColor(self._oldClearColor, self.oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }
}
