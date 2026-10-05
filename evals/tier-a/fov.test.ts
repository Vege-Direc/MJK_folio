import { describe, expect, it } from 'vitest';
import { fovFor } from '@/lib/mind/scene';

/**
 * The lens widens on a portrait screen and is untouched on a landscape one.
 *
 * This exists because the first version of the ramp lived only in `resize`, and a phone
 * does not fire a resize on load -- it opens at its size. Rendering at a ceiling of 62 and
 * at 88 produced identical frames and I nearly read that as "the change does nothing"
 * rather than "the change never ran". A test on the pure function catches that case
 * without a browser, which is the only reason it is caught reliably at all: the visual
 * harness that should have caught it is not deterministic enough to trust.
 */
const hFov = (v: number, aspect: number) =>
  (2 * Math.atan(Math.tan((v * Math.PI) / 360) * aspect) * 180) / Math.PI;

describe('portrait field of view', () => {
  it('leaves every landscape aspect at the tuned 62', () => {
    for (const aspect of [1.0, 1.33, 1.6, 1.78, 2.4]) expect(fovFor(aspect)).toBe(62);
  });

  it('widens monotonically as the viewport narrows', () => {
    const at = [1.0, 0.75, 0.587, 0.5, 0.462].map(fovFor);
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThanOrEqual(at[i - 1]);
  });

  it('recovers horizontal angle on a phone rather than leaving it at a third of desktop', () => {
    // The defect, in one assertion: 62 vertical at 390x844 is 31 degrees horizontal
    // against the desktop's 87.7. The ramp has to claw a meaningful part of that back.
    expect(hFov(62, 0.462)).toBeLessThan(32);
    expect(hFov(fovFor(0.462), 0.462)).toBeGreaterThan(38);
  });

  it('stays short of fisheye', () => {
    // A true horizontal lock would demand 128.7 vertical at this aspect. Anything past
    // about 100 stretches a soma near the edge into an ellipse.
    for (const aspect of [0.462, 0.3, 0.1]) expect(fovFor(aspect)).toBeLessThanOrEqual(100);
  });
});
