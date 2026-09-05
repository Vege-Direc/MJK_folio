'use client';

import Image from 'next/image';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

/**
 * JewelAI Studio's evidence: the photographs a client sends, and what comes back.
 *
 * WHY THE REFERENCES ABUT WITH NO GAP. MJK's own Krunch Labs deck draws this exact
 * pipeline and it draws the input as ONE box containing three abutting photographs with
 * one arrow leaving it — not three arrows converging. The distinction is the claim: three
 * arrows say "three things were combined", and what actually happens is "one thing was
 * photographed three times". Three tiles inside a single casing ring with zero gutter read
 * as one rectangle because they are one rectangle, which is the mechanism drawn rather
 * than asserted.
 *
 * WHY THE REFERENCES ARE CROPPED, WHEN NOTHING ELSE ON THIS SITE IS. Measured on the three
 * source files with a saturation mask (S>105, V>70, 1st/99th percentile bounding box): the
 * ring occupies 34-41% of the frame WIDTH and only 15-16% of its HEIGHT. Uncropped, in the
 * 98px tile this layout gives it on a desktop, the ring would render 37px wide and 16px
 * tall — a speck, and no evidence of anything. Cropped square on each frame's own ring
 * centre it is 62-74% of the tile. A crop is not a squeeze: §05's before-and-after already
 * crops both photographs to a common 4:3, and the fault TASKS item 1 records was a 1.36
 * ASPECT DISTORTION, which nothing here does. Every crop is square and each frame keeps
 * enough windowsill to still read as a phone snap on a windowsill.
 *
 * WHY THERE IS ONE OUTPUT TILE AND NOT TWO. The still and the clip were specified as two
 * tiles side by side. They cannot be: `generated image.jpeg` IS frame 0 of
 * `Generated video.mp4`. Mean absolute luma difference between them is 3.37 of 255, which
 * is JPEG-against-h264 noise, not a different photograph. Two tiles would have printed the
 * same picture twice. One tile, and the still is the clip's poster — which is also the
 * corpus claim `jewelai-video` makes, drawn instead of written: the clip animates an image
 * the pipeline had already made and already checked.
 *
 * WHY THE CLIP IS 640px AND WHY IT DOES NOT AUTOPLAY. The source is 5,376 kB at 960x960
 * and 10.9 Mbit/s, which is about 0.49 bits per pixel per frame — an order of magnitude
 * past what a slow orbit around a static object needs. Re-encoded here at 640x640 h264
 * CRF 30 it is 225 kB, 23.9x smaller, and 640 is above 2x DPR at the 232-295px this tile
 * renders. It is behind `preload="none"` and a real control because this site measured a
 * perpetual animation costing 11% of its framerate and taking the worst frame from 66ms to
 * 92ms, and a video decode is strictly more expensive than the `stroke-dashoffset` loop
 * that produced that number.
 */

const REFS = [
  {
    src: '/media/jewelai/ref-1.jpg',
    alt: 'A gold wire ring with a pale pink stone, photographed on a white windowsill from the side, the twisted band lying as a wide ellipse with the stone at the right.',
  },
  {
    src: '/media/jewelai/ref-2.jpg',
    alt: 'The same ring from a second angle, the band turned so it reads as a narrower ellipse and the stone sits at the upper left.',
  },
  {
    src: '/media/jewelai/ref-3.jpg',
    alt: "The same ring viewed almost straight down the band's axis, so the wire wrapped in turns around the stone reads clearly.",
  },
] as const;

const POSTER = {
  src: '/media/jewelai/generated.jpg',
  alt: 'A generated photograph of the same ring resting on wet slate with moss growing from a crack, lit low and warm from behind.',
};

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export default function JewelEvidence() {
  const video = useRef<HTMLVideoElement>(null);
  /** The clip is not in the DOM at all until it is asked for, so `preload` never has to be trusted. */
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);

  /*
   * Read during render, not from an effect: it decides whether `loop` is on the element
   * at all, and an effect would set it one commit after the clip started. Server snapshot
   * is `false`, which is the honest answer — a server has no preference to report.
   */
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );

  /*
   * `playing` is never set optimistically, and that is deliberate.
   *
   * The first version set it to `true` on the click that mounted the element, so the
   * control read PAUSE whether or not anything had started. It is worth being strict about
   * because playback genuinely can refuse: `play()` returns a promise that rejects under an
   * autoplay policy, and a browser without an H.264 decoder — the headless Chromium this
   * was verified in is one — mounts the element, fetches the file and then plays nothing at
   * all. A control that claims a state the media is not in is worse than one that lags it,
   * so the element's own `play` and `pause` events are the only things that move the label.
   */
  const toggle = useCallback(() => {
    if (!started) {
      setStarted(true);
      return;
    }
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      // Under reduced motion there is no `loop`, so the clip stops at the end. Pressing
      // play on a finished clip has to mean "again" rather than "resume the last frame".
      if (el.ended) el.currentTime = 0;
      void el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [started]);

  return (
    <figure className="jp">
      <div className="jp-flow">
        {/*
          One casing ring around all three, and no gutter between them. See the header:
          this is the deck's own convention and it is the difference between "three things
          combined" and "one thing seen three ways".
        */}
        <div className="jp-refs">
          {REFS.map((r) => (
            <Image
              key={r.src}
              src={r.src}
              alt={r.alt}
              width={660}
              height={660}
              sizes="(max-width: 900px) 21vw, 110px"
              loading="lazy"
            />
          ))}
        </div>

        {/*
          Drawn, not typed, for the reason `ApparelPair` gives: a character would inherit
          the body face and sit on a baseline that has nothing to do with the two things it
          points between. Cased — fat and dark underneath, accent over — because the only
          thing behind it is a moving particle field and `DESIGN.md` forbids putting a
          scrim between the two.
        */}
        <svg className="jp-arrow" viewBox="0 0 24 12" aria-hidden="true" focusable="false">
          <path className="jp-arrow-case" d="M1 6 H21 M16 1.5 L21.5 6 L16 10.5" />
          <path className="jp-arrow-ink" d="M1 6 H21 M16 1.5 L21.5 6 L16 10.5" />
        </svg>

        <div className="jp-out">
          {started ? (
            /*
             * `autoPlay` is defensible here and only here: the element does not exist
             * until a finger or a key has asked for it. `loop` is dropped under reduced
             * motion — the clip plays once and stops — which is the reading of WCAG 2.2
             * SC 2.2.2 that `Carousel.tsx` settled for this page.
             */
            <video
              ref={video}
              src="/media/jewelai/clip.mp4"
              poster={POSTER.src}
              preload="none"
              muted
              playsInline
              autoPlay
              loop={!reduced}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              aria-label="A four-second clip: the camera pulls back and around the same generated scene, the ring on wet slate."
            />
          ) : (
            <Image
              src={POSTER.src}
              alt={POSTER.alt}
              width={1024}
              height={1024}
              sizes="(max-width: 900px) 62vw, 300px"
              loading="lazy"
            />
          )}

          {/*
            The whole frame is the control, so the target is 295px square rather than the
            60x19px the carousel's toggle measured before it was enlarged. The visible chip
            sits in a corner so it never covers the thing it is offering.
          */}
          <button type="button" className="jp-play" onClick={toggle} aria-pressed={playing}>
            <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
            {playing ? 'Pause' : 'Play the clip'}
          </button>
        </div>
      </div>

      <p className="jp-meta">
        <span>phone snaps · one piece</span>
        <span className="jp-meta-out">generated</span>
      </p>

      {/*
        Every clause is corpus. "JewelAI Studio" and the reference set travelling with each
        generation are `jewelai-reads-the-piece`; the clip starting from an image the
        pipeline had already made and checked is `jewelai-video`; that these particular
        photographs are JewelAI's is `jewelai-the-ring`, which had to be added because the
        corpus tied no file to any project and the caption asserts one.
      */}
      <figcaption className="jp-cap">
        JewelAI Studio. The whole reference set goes with every image it generates, and the
        clip starts from the still — an image it had already made and already checked.
      </figcaption>
    </figure>
  );
}
