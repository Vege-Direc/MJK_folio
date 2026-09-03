import Image from 'next/image';

/**
 * §07's proof: one supplier photograph and the catalogue frame the pipeline made from it.
 *
 * WHY A PAIR AND NOT A WIPE. The two frames are different shapes — 0.926 and 0.806 — and
 * they are different shapes because the generated frame is a different photograph, not a
 * retouch of the first. A wipe would have to crop or squeeze one of them to pretend
 * otherwise, and this repository has already paid for that once: the RD 350 comparison
 * shipped a 1.36 aspect squeeze from a homography fitted to too few points. So they sit
 * side by side at a shared baseline and a shared height, visibly unequal in width. A
 * reader takes that as deliberate, because it is.
 *
 * WHY THESE TWO FILES. Of eighteen generated frames this is the pair where the evidence is
 * clearest: the block print, the zari border and the blue tassels all survive intact while
 * the entire room around them is invented. The frames that read as "nice photo" prove
 * less than the ones where you can check the fabric.
 *
 * WHAT THE CAPTION MAY SAY. Every clause is `project-photoshoot-pipeline`, near-verbatim,
 * and it deliberately does not say "on model" — reading the codebase established that this
 * batch rehangs the garments on a rack rather than dressing anyone, and a caption that
 * contradicts the picture beside it is worse than a caption that says less. The client is
 * not named anywhere, which is also the corpus's own position.
 */

const SUPPLIER = { src: '/media/apparel/supplier-82.jpg', w: 833, h: 900 };
const CATALOGUE = { src: '/media/apparel/catalogue-82.jpg', w: 725, h: 900 };

export default function ApparelPair() {
  return (
    <figure className="pair">
      <div className="pair-frames">
        <div className="pair-cell">
          <Image
            src={SUPPLIER.src}
            alt="A block-printed kaftan and its matching red dupatta, pinned flat against a moulded white wall with a batch number stuck to the fabric."
            width={SUPPLIER.w}
            height={SUPPLIER.h}
            sizes="(max-width: 900px) 44vw, 22vw"
            loading="lazy"
          />
          <span className="pair-meta">supplier · as shot</span>
        </div>

        {/*
          The arrow is drawn rather than typed. A character would inherit the body face and
          sit on a baseline it does not belong to; four line segments sit where they are
          put. Cased like every other stroke on this page: fat and dark underneath, accent
          on top, so it survives the network behind it without a scrim.
        */}
        <svg className="pair-arrow" viewBox="0 0 24 12" aria-hidden="true" focusable="false">
          <path className="pair-arrow-case" d="M1 6 H21 M16 1.5 L21.5 6 L16 10.5" />
          <path className="pair-arrow-ink" d="M1 6 H21 M16 1.5 L21.5 6 L16 10.5" />
        </svg>

        <div className="pair-cell">
          <Image
            src={CATALOGUE.src}
            alt="The same kaftan and dupatta on a turned-wood clothing rail in a styled room, against a deep red wall, with a fringed lamp on either side."
            width={CATALOGUE.w}
            height={CATALOGUE.h}
            sizes="(max-width: 900px) 38vw, 19vw"
            loading="lazy"
          />
          <span className="pair-meta">catalogue frame</span>
        </div>
      </div>

      <figcaption className="pair-cap">
        Raw supplier photographs became more than 50 on-brand catalog images across 20+ products,
        through a pipeline of creative-director, prompt-writer and QA-critic agents with
        self-improving prompt memory.
      </figcaption>
    </figure>
  );
}
