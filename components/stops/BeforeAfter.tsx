'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * The RD 350, stock and rebuilt, in one frame — as two photographs, not as one.
 *
 * This was a wipe, and the wipe was built on a homography fitted to six points on the two
 * wheels. Measured back off the shipped file, that homography sampled a 2053x1133 region
 * of IMG_0695 into a 668x501 frame: a 1.36 aspect squeeze, so the stock bike stood 36%
 * too tall for its length, its wheels visible ellipses. The finished bike beside it was a
 * plain crop, untouched. That is the distortion, and it was in the image preparation, not
 * in any stylesheet.
 *
 * It could not have come out otherwise. Six points on two wheels sit in a band a quarter
 * of the frame tall; a homography fitted to them is free to choose almost any vertical
 * scale, and it chose a wrong one. But the deeper problem is that there was nothing right
 * for it to choose. Wheelbase divided by summed wheel radii — a number no rotation, no
 * uniform scale and no translation can change — is 2.95 in the stock photograph and 2.24
 * in the finished one, 32% apart. The cameras were not in the same place: the finished
 * bike was shot close enough that you look down onto the top of the tank, and the stock
 * bike was shot square from tank height, where the tank has no visible top at all.
 *
 * So a least-squares similarity over both hubs and both contact patches leaves 15px RMS
 * on a 564px wheelbase, and its error is almost purely vertical and antisymmetric — hubs
 * pushed one way, tyre contacts the other — which is the signature of wheels that are the
 * wrong size for the wheelbase. Match the wheelbase and the stock wheels come out 24%
 * small; match the wheels and the rear axle misses by 180px, 32% of the wheelbase. The
 * only transforms that close that gap are ones that distort: a full affine needs 38%
 * anisotropy, and the four-point homography that fits exactly leaves a wheel 32% out of
 * round. Every honest option was a bad wipe.
 *
 * So it is a cut. Each photograph is cropped to the hero's 4:3 and resized once,
 * uniformly — 2592x1936 -> x[0,2581] -> 780x585 for the stock bike, 780x640 -> y[8,593]
 * for the finished one, which needs no resize at all. Nothing is warped on either axis.
 * Both keep the whole machine, both face the same way, and both put the tyres' ground
 * line at 81-82% of the frame, so pressing the control does not move the floor. The
 * finished bike reads larger because the photographer stood closer, which is true and is
 * the one thing a registered wipe was there to hide.
 *
 * The stock frame carries a gamma that lands its midtone on the finished frame's,
 * measured off percentiles (median luma 152 against 92). Left raw, the cut reads as an
 * exposure change rather than as a rebuild.
 */

const BEFORE_SRC = '/media/rd350/compare-before.jpg';
const AFTER_SRC = '/media/rd350/compare-after.jpg';

/** Both frames are cut to the hero's own 4:3, so they share a size. */
export const COMPARE_W = 780;
export const COMPARE_H = 585;

const BEFORE_ALT =
  'The RD 350 before the rebuild: maroon paintwork, the factory tank with its Yamaha badge, a long black bench seat, chrome crash bars and a drum brake on the spoked front wheel, parked on a tiled porch.';

const AFTER_ALT =
  'The same motorcycle rebuilt as a cafe racer: a hand-made bare-metal tank and seat cowl, a blacked-out frame and engine, a disc brake and telescopic forks at the front, and an upswept exhaust, standing on bare earth.';

/** The media column is 42vw on desktop and the full column below 900px. */
const SIZES = '(max-width: 900px) 86vw, 42vw';

export default function BeforeAfter({ className }: { className?: string }) {
  const [stock, setStock] = useState(false);

  return (
    <div className={className ? `ba ${className}` : 'ba'}>
      {/*
        The rebuilt bike is the base layer; the stock bike is drawn over it and clipped
        away when it is not wanted. Neither is ever an image at zero opacity — a raster
        faded to nothing is a raster that never reached the screen — and neither is hidden
        with `visibility`, because a carousel frame that is not showing hides the whole
        `.ba` with it and a child set back to `visible` would punch through it.
      */}
      <Image
        className="ba-frame"
        src={AFTER_SRC}
        alt={AFTER_ALT}
        width={COMPARE_W}
        height={COMPARE_H}
        sizes={SIZES}
        loading="lazy"
      />
      <Image
        className="ba-frame ba-stock"
        data-show={stock || undefined}
        src={BEFORE_SRC}
        alt={BEFORE_ALT}
        width={COMPARE_W}
        height={COMPARE_H}
        sizes={SIZES}
        loading="lazy"
      />

      {/*
        A cut, not a cross-fade: the two photographs are not registered and never can be,
        so any moment where both are on screen at once is a moment of two mismatched bikes
        ghosting through each other. One button over the whole photograph, so the
        comparison itself is the target, and keyboard, touch and a pressed state come with
        it. The two chips report which frame is up; they are decoration, and the button's
        own label is what a screen reader reads.
      */}
      <button
        type="button"
        className="ba-swap"
        aria-pressed={stock}
        aria-label="Show the stock motorcycle, before the rebuild"
        onClick={() => setStock((s) => !s)}
      >
        <span className="ba-tag" data-on={stock || undefined} aria-hidden="true">
          stock
        </span>
        <span className="ba-tag" data-on={!stock || undefined} aria-hidden="true">
          rebuilt
        </span>
      </button>
    </div>
  );
}
