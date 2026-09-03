/**
 * The MJK-101, traced from MJK's own CAD render.
 *
 * GENERATED. The source is his Airbus design poster, `Airbus Presentation.pdf`, whose
 * plan view is an embedded raster. It was thresholded on the blue channel, contoured with
 * OpenCV, simplified with `approxPolyDP` at 0.16% of the perimeter, and rotated 180
 * degrees so the nose points up. Nothing here is drawn by hand, which is the point: the
 * corpus licenses the aircraft's numbers, and this is the aircraft's own outline rather
 * than an artist's impression of an airliner.
 *
 * The trace validates against the poster's own specification. Span over length comes out
 * 1.095 from the outline against 110/97 = 1.134 stated, a 3.4% disagreement that is the
 * tailplane and the nose cone extending the drawn length past the quoted one.
 *
 * To regenerate: `gen-plane.py` in the session scratchpad.
 */

/** The shared coordinate space for every part of this figure. */
export const FIG_VIEWBOX = '0 0 300 232';

/** The planform outline, nose up. */
export const MJK101_PATH =
  'M110.38 209.8 L148.13 203.38 L150.0 212.48 L153.75 203.11 L191.22 207.93 L189.08 198.02 L171.95 188.92 L171.42 186.51 L159.37 181.7 L159.9 145.56 L249.05 160.82 L248.78 155.73 L185.34 126.28 L184.26 107.81 L174.9 107.81 L174.36 120.13 L158.83 113.43 L158.3 65.52 L156.42 54.81 L148.13 35.8 L150.8 31.52 L147.32 31.79 L147.32 35.27 L144.11 37.68 L137.42 66.05 L138.76 113.7 L123.77 120.66 L122.96 108.62 L113.06 108.62 L112.26 127.62 L50.95 158.94 L50.95 164.03 L139.56 145.82 L141.17 181.7 L111.18 199.9Z';

/**
 * Where the dimension lines go, derived from the outline rather than typed in, so they
 * cannot drift away from the shape they measure.
 */
export const MJK101_SPAN = { x0: 50.95, x1: 249.05, y: 226.48 };
export const MJK101_LENGTH = { y0: 31.52, y1: 212.48, x: 34.95 };
