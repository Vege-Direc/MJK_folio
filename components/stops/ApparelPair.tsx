'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * §07's proof: four supplier photographs and the four catalogue frames the pipeline made
 * from them, one pair at a time.
 *
 * WHY FOUR AND NOT ONE. The section shipped with a single pair and the owner's reading of
 * it was "one seems way too less" — a fair reading, because one pair is an anecdote and
 * the sentence beneath it claims more than 50 images across 20+ products. Four unrelated
 * garments in four invented rooms is the smallest number that shows the art direction
 * holding rather than one lucky frame.
 *
 * WHY NOT FIFTEEN, AND WHY NOT EVEN TWO ON SCREEN AT ONCE. §07 is an index across four
 * projects; fifteen frames of one apparel client turns it into a case study of that
 * client. And the arithmetic forbids stacking anyway: the media column is a 623px band at
 * 1440x900, `.panel` is `overflow: hidden`, and one pair plus two cards is already ~646px
 * there. A second always-visible pair would not scroll — it would silently destroy a card
 * and half a photograph. A stepper is the same height as one pair, so the fourth costs
 * nothing the first did not.
 *
 * WHY A PAIR AND NOT A WIPE. The two frames in a pair are different shapes because the
 * generated frame is a different photograph, not a retouch of the first. A wipe would have
 * to crop or squeeze one of them to pretend otherwise, and this repository has already
 * paid for that once: the RD 350 comparison shipped a 1.36 aspect squeeze from a
 * homography fitted to too few points. So they sit side by side at a shared baseline and a
 * shared height, visibly unequal in width. A reader takes that as deliberate, because it
 * is.
 *
 * WHY THESE FOUR PAIRS. All fifteen sets were rendered side by side and the survivors
 * re-cropped around the garment at about 2x. The test is not "nice photograph" — it is
 * whether a sceptic can name a thing and find it in both frames. Rejected on drift:
 * set 41, where the source's two columns of circular medallions come back as one; set 74,
 * where crisp stripe panels come back as a small floral; set 76, where the dupatta's field
 * shifts cream to gold; sets 15, 16 and 84, where the evidence is folded out of shot in
 * the generated frame. What survives here survives intact — the stripe angle, the count of
 * the circles, the zari lattice, the tassels — while the entire room is invented.
 *
 * WHAT THE CAPTION MAY SAY. Every clause is `project-photoshoot-pipeline` verbatim, and it
 * deliberately does not say "on model": this batch rehangs the garments on a rack rather
 * than dressing anyone, and a caption that contradicts the picture beside it is worse than
 * a caption that says less. It no longer carries the "pipeline of creative-director,
 * prompt-writer and QA-critic agents" clause either — that is the first sentence of the
 * same memory, which is what the card directly beneath prints, so it was being said twice
 * and cost the figure a line it needs. The client is not named anywhere, which is also the
 * corpus's own position.
 */

type Pair = {
  /** The supplier's own set number, which is also printed across the supplier frame. */
  readonly id: string;
  /** Names the tab for a screen reader, the way `Carousel`'s thumbnails are named. */
  readonly cap: string;
  readonly supplier: { readonly src: string; readonly w: number; readonly h: number; readonly alt: string };
  readonly catalogue: { readonly src: string; readonly w: number; readonly h: number; readonly alt: string };
};

/**
 * Alt text is observation, which is always allowed, and it has to be observed correctly.
 *
 * The numeral in each supplier frame is composited into the image, not stuck to the cloth:
 * looked at at full resolution it has no perspective, no shadow and no fold, and it lies
 * flat across a draped dupatta. The component used to call it "a batch number stuck to the
 * fabric", which is a claim about the photograph that the photograph does not support.
 */
const PAIRS = [
  {
    id: '82',
    cap: 'cream kaftan, red medallions',
    supplier: {
      src: '/media/apparel/supplier-82.jpg',
      w: 833,
      h: 900,
      alt: 'A cream kaftan printed with red and blue hexagonal medallions, beside its red block-printed dupatta, pinned flat against a moulded white wall, with the set number 82 printed across the image.',
    },
    catalogue: {
      src: '/media/apparel/catalogue-82.jpg',
      w: 725,
      h: 900,
      alt: 'The same kaftan and dupatta on two hangers on a turned-wood rail in a styled room, against a deep red wall stencilled with hexagons, a fringed lamp on either side.',
    },
  },
  {
    id: '104',
    cap: 'striped kaftan, blue triangles',
    supplier: {
      src: '/media/apparel/supplier-104.jpg',
      w: 866,
      h: 900,
      alt: 'A kaftan with black-and-white diagonally striped sleeves, a blue panel of triangles and medallions and cream circles at the yoke and hem, beside a black dupatta patterned with red and blue interlace and bordered in gold, pinned flat against a moulded white wall, with the set number 104 printed across the image.',
    },
    catalogue: {
      src: '/media/apparel/catalogue-104.jpg',
      w: 725,
      h: 900,
      alt: 'The same kaftan on a hanger and the same dupatta folded over a turned-wood rail, in a styled room against a green wall stencilled with a starburst, a fringed lamp on either side.',
    },
  },
  {
    id: '8',
    cap: 'red kaftan, lotus print',
    supplier: {
      src: '/media/apparel/supplier-8.jpg',
      w: 771,
      h: 900,
      alt: 'A red kaftan printed with blue lotus motifs and a chevron neck panel, beside a black dupatta with a gold woven border of vines and birds and a row of blue tassels, pinned flat against a moulded white wall, with the set number 8 printed across the image.',
    },
    catalogue: {
      src: '/media/apparel/catalogue-8.jpg',
      w: 725,
      h: 900,
      alt: 'The same kaftan on a hanger on a turned-wood rail and the same dupatta hanging full length beside it, in a styled room against a dark red wall stencilled with a lotus inside an arch.',
    },
  },
  {
    id: '78',
    cap: 'striped kaftan, circle print',
    supplier: {
      src: '/media/apparel/supplier-78.jpg',
      w: 844,
      h: 900,
      alt: 'A kaftan with blue-and-white striped columns down the front and large grey circles on red sleeve panels, beside a red dupatta densely printed with medallions and bordered in gold, pinned flat against a moulded white wall, with the set number 78 printed across the image.',
    },
    catalogue: {
      src: '/media/apparel/catalogue-78.jpg',
      w: 725,
      h: 900,
      alt: 'The same kaftan on a hanger on a turned-wood rail and the same dupatta draped over the rail and pooling on the floor, in a styled room against a dark maroon wall stencilled with flowers.',
    },
  },
] as const satisfies readonly Pair[];

/*
 * `sizes` describes what is actually drawn, not the column.
 *
 * The frames are height-driven, so their widths are `--pair-h` times each file's own
 * ratio: at 1440x900 that is 239-269px for a supplier frame and 225px for a catalogue
 * one, and at 390x664 it is 285-320px and 268px. Asking for the full 581px column — which
 * is what the old `22vw` did — bought a source three times larger than anything rendered,
 * and the supplier frames are edge-to-edge block print, the content AVIF handles worst.
 */
const SUPPLIER_SIZES = '(max-width: 900px) 82vw, 270px';
const CATALOGUE_SIZES = '(max-width: 900px) 69vw, 226px';

const pad = (n: number) => String(n).padStart(2, '0');

export default function ApparelPair() {
  const [pair, setPair] = useState(0);
  // Which frame the phone is showing. Desktop shows both and ignores this entirely.
  const [supplier, setSupplier] = useState(true);
  const tabs = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);

  /*
   * Chrome will not lazy-load an image whose box is fully clipped.
   *
   * Measured on the production build at 390x664: every `[data-off]` frame — the one the
   * phone hides with `clip-path: inset(0 100% 0 0)` — was still at `naturalWidth: 0`
   * after twenty seconds in the viewport, while every frame in a `visibility: hidden`
   * pair decoded normally. So the first tap of the swap showed an empty ring and then
   * waited for a network round trip.
   *
   * `BeforeAfter.tsx` states the opposite as fact — "Clipped, the raster still decodes" —
   * and its `.ba-stock` image is `loading="lazy"` behind the same clip, so §05 has the
   * same fault. It is not fixed here; it is one line and it belongs to that component.
   *
   * The fix is to promote the SHOWING PAIR's two frames to `eager` once the figure is
   * near the viewport, and to leave the other three pairs lazy. `visibility: hidden` does
   * not block loading, so on a desktop — where nothing is clipped — this changes nothing
   * at all, and on a phone it costs one extra request rather than eight.
   */
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      // Far enough ahead that the frames are decoded before §07 is read, and near enough
      // that a visitor who never reaches §07 never pays for them.
      { rootMargin: '600px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /*
   * Roving tabindex, the same model `.carousel-strip` uses: exactly one tab is in the tab
   * order, and Left/Right move between them. Moving focus is part of the contract — a
   * roving index that changes `tabIndex` without calling `focus()` strands the keyboard
   * on an element that is no longer reachable.
   */
  const step = useCallback((delta: number) => {
    setPair((i) => {
      const to = (i + delta + PAIRS.length) % PAIRS.length;
      tabs.current?.querySelectorAll('button')[to]?.focus();
      return to;
    });
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  };

  return (
    <figure className="pair" ref={root}>
      <div className="pair-frames">
        {PAIRS.map((p, i) => {
          // Only the pair on screen is promoted; the other three stay lazy. See `near`.
          const loading = near && i === pair ? 'eager' : 'lazy';
          return (
            <div
              key={p.id}
              className="pair-set"
              data-on={i === pair || undefined}
              role="tabpanel"
              id={`pair-panel-${p.id}`}
              aria-labelledby={`pair-tab-${p.id}`}
            >
              <div className="pair-cell" data-off={!supplier || undefined}>
                <Image
                  src={p.supplier.src}
                  alt={p.supplier.alt}
                  width={p.supplier.w}
                  height={p.supplier.h}
                  sizes={SUPPLIER_SIZES}
                  loading={loading}
                />
                <span className="pair-meta">supplier · as shot</span>
              </div>

              {/*
                The arrow is drawn rather than typed. A character would inherit the body face
                and sit on a baseline it does not belong to; four line segments sit where
                they are put. Cased like every other stroke on this page: fat and dark
                underneath, accent on top, so it survives the network behind it without a
                scrim.
              */}
              <svg className="pair-arrow" viewBox="0 0 24 12" aria-hidden="true" focusable="false">
                <path className="pair-arrow-case" d="M1 6 H21 M16 1.5 L21.5 6 L16 10.5" />
                <path className="pair-arrow-ink" d="M1 6 H21 M16 1.5 L21.5 6 L16 10.5" />
              </svg>

              <div className="pair-cell" data-off={supplier || undefined}>
                <Image
                  src={p.catalogue.src}
                  alt={p.catalogue.alt}
                  width={p.catalogue.w}
                  height={p.catalogue.h}
                  sizes={CATALOGUE_SIZES}
                  loading={loading}
                />
                <span className="pair-meta">catalogue frame</span>
              </div>

              {/*
                Phone only. Both frames stay in the document either way — the one not showing
                is clipped, not removed — so this changes what is on screen and not what is
                readable.
              */}
              <button
                type="button"
                className="pair-swap"
                aria-pressed={supplier}
                aria-label="Show the supplier photograph instead of the catalogue frame"
                onClick={() => setSupplier((s) => !s)}
              >
                <span className="ba-tag" data-on={supplier || undefined} aria-hidden="true">
                  supplier
                </span>
                <span className="ba-tag" data-on={!supplier || undefined} aria-hidden="true">
                  catalogue
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/*
        The pager comes before the caption in the DOM and after it on the screen: a
        `figcaption` has to be its figure's first or last child, and the grid is what puts
        the two on one line. See `.pair` in globals.css for why they share a line at all.
      */}
      <div ref={tabs} className="pair-nav" role="tablist" aria-label="Supplier and catalogue pairs" onKeyDown={onKeyDown}>
        {PAIRS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pair-tab-${p.id}`}
            aria-selected={i === pair}
            aria-controls={`pair-panel-${p.id}`}
            aria-label={`Pair ${i + 1}: ${p.cap}`}
            tabIndex={i === pair ? 0 : -1}
            onClick={() => setPair(i)}
          >
            {pad(i + 1)}
          </button>
        ))}
      </div>

      <figcaption className="pair-cap">
        Raw supplier photos became more than 50 on-brand catalog images across 20+ products.
      </figcaption>
    </figure>
  );
}
