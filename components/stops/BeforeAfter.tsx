'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';

/**
 * The RD 350, stock and rebuilt, in one frame.
 *
 * Two photographs of the same motorcycle taken years apart, on different phones, from
 * different distances. Registering them was the work. A crop and a resize cannot do it:
 * in the 2011 photograph the camera stood close, so the wheels — at the two ends of the
 * bike and therefore furthest from the lens — come out about a quarter smaller than the
 * wheelbase between them implies. Match the wheels and the tail runs off the frame;
 * match the wheelbase and the wheels shrink. Both readings are of the same plane through
 * the middle of the machine, so the correction is the projective one: a homography fitted
 * to four points on the two wheels (each tyre's top, bottom and hub centre), which puts
 * both axles, the ground line and the frame rail in the same place in both frames. The
 * stock photograph then runs out of picture at the left, which is why both frames lose
 * the same sliver off the front tyre — cropping one and not the other would be the tell.
 *
 * The stock frame is also graded to the finished one's black point and midtone, measured
 * off its percentiles. Left raw it is a stop brighter with milky shadows, and the wipe
 * reads as an editing artefact rather than as a rebuild.
 *
 * The control is a real `<input type="range">`. Keyboard, touch, screen reader and
 * click-to-jump come with it and none of them has to be reimplemented; the visible line
 * and knob are drawn separately and the input itself is transparent over the whole
 * figure, so the whole photograph is the drag target.
 */

const BEFORE_SRC = '/media/rd350/compare-before.jpg';
const AFTER_SRC = '/media/rd350/compare-after.jpg';

/** Both frames are cut from the same registered field, so they share a size. */
export const COMPARE_W = 668;
export const COMPARE_H = 501;

const BEFORE_ALT =
  'The RD 350 before the rebuild: maroon paintwork, the factory tank with its Yamaha badge, a long black bench seat, chrome crash bars and a drum brake on the spoked front wheel, parked on a tiled porch.';

const AFTER_ALT =
  'The same motorcycle rebuilt as a cafe racer: a hand-made bare-metal tank and seat cowl, a blacked-out frame and engine, a disc brake and telescopic forks at the front, and an upswept exhaust, standing on bare earth.';

/** The media column is 42vw on desktop and the full column below 900px. */
const SIZES = '(max-width: 900px) 86vw, 42vw';

export default function BeforeAfter({ className }: { className?: string }) {
  const [split, setSplit] = useState(50);

  return (
    <div
      className={className ? `ba ${className}` : 'ba'}
      style={{ '--ba-split': `${split}%` } as CSSProperties}
    >
      {/*
        The rebuilt bike is the base layer and is never clipped; the stock bike is drawn
        over it and clipped from the right. Neither is ever an image at zero opacity —
        a raster faded to nothing is a raster that never reached the screen.
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
        src={BEFORE_SRC}
        alt={BEFORE_ALT}
        width={COMPARE_W}
        height={COMPARE_H}
        sizes={SIZES}
        loading="lazy"
      />

      <div className="ba-line" aria-hidden="true">
        <span className="ba-knob" />
      </div>

      <input
        className="ba-range"
        type="range"
        min={0}
        max={100}
        step={1}
        value={split}
        onChange={(e) => setSplit(e.target.valueAsNumber)}
        aria-label="Wipe between the stock motorcycle and the finished cafe racer"
        /*
         * A screen reader reading "50" off a slider over two photographs says nothing.
         * The value is a position between two named states, so it is announced as one.
         */
        aria-valuetext={`${split} of 100 showing the stock bike, ${100 - split} showing the rebuild`}
      />
    </div>
  );
}
