'use client';

import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import type { TimelineGroup } from './timeline-entry';
import { periodLabel } from './timeline-entry';

/**
 * The reading line, as a percentage inset from each edge of the viewport.
 *
 * Named rather than inlined into the rootMargin string because the whole point is that
 * the active row is the one the reader is level with, not the one merely on screen —
 * and because a bare "-42%" in a string is indistinguishable, to the copy scanner that
 * guards this directory, from an unlicensed statistic.
 */
const READING_BAND = 42;

/**
 * "Has this rendered on the client yet?", without a setState in an effect.
 *
 * The server snapshot is `false` and the client snapshot is `true`, so the first client
 * render still matches the server HTML — hydration agrees — and React immediately
 * re-renders with the real value. Nothing to subscribe to: whether we are on the client
 * is not a thing that changes twice.
 */
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * The career as a dated rail: every entry's period and title visible at once, with one
 * entry's full text expanded in place.
 *
 * Not a horizontal scrubber and not a carousel. This page's whole premise is a single
 * vertical axis; a second scroll axis fights the browser's edge-swipe on a phone and the
 * page scroll everywhere else, and it hides most of the entries behind an interaction —
 * which breaks the promise that the authored page is complete if nobody ever types a
 * question. A vertical rail keeps the shape of the career, which is the thing a hiring
 * manager actually scans, on screen the whole time.
 *
 * ── Progressive enhancement, in that direction and not the other ──
 * The server renders every panel open, and the client collapses them on mount. Never the
 * reverse. With no JavaScript, a hydration that never arrives, or a provider that throws,
 * the reader still gets the complete history rather than ten headings and no content.
 * `collapsed` is read through `useSyncExternalStore` rather than set in an effect: the
 * server snapshot is `false`, so the first client render matches the HTML exactly and
 * hydration agrees, and React then re-renders with the client snapshot and folds them.
 *
 * ── The accordion pattern, not the tabs pattern ──
 * Every header is a real `<button>`: in the tab order for free, `Enter` and `Space`
 * toggle for free, and no roving `tabindex` to get wrong. Arrow keys are a convenience
 * on top, and they only ever act when a header already holds focus — anything else would
 * take `ArrowDown` away from the page, on a page whose primary control is scrolling.
 */
export default function Timeline({ groups }: { groups: TimelineGroup[] }) {
  const collapsed = useSyncExternalStore(subscribe, onClient, onServer);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  /**
   * Which row the reader is level with, and how far down the spine that is.
   *
   * The complaint about the first version was that it gave no sign of being interactive
   * until you clicked it, and the diagnosis was that the signal had nowhere to land: one
   * lit rule among ten identical rules registers as nothing. With a spine it lands —
   * the tick at the active row brightens and lengthens, and the run of spine above it
   * goes warm.
   *
   * `--t` is measured off the row rather than counted from an index, so an era caption
   * or an open panel cannot put the warm run out of step with the ticks. It is
   * decoration by construction: with no JavaScript it is simply never set, the spine
   * stays uniformly dim, and nothing about the rail depends on it.
   *
   * An IntersectionObserver rather than a scroll handler, because this is a question
   * about what is on screen and that is what the observer is for — no listener running
   * on every frame of a scroll-driven page that already has a camera to feed.
   */
  useEffect(() => {
    const list = listRef.current;
    const rows = Array.from(list?.querySelectorAll<HTMLElement>('.tl-row') ?? []);
    if (!list || !rows.length) return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entriesIn) => {
        for (const e of entriesIn) seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let bestId: string | null = null;
        let best = 0;
        for (const [id, ratio] of seen) {
          if (ratio > best) {
            best = ratio;
            bestId = id;
          }
        }
        setActiveId(bestId);

        const row = rows.find((r) => r.id === bestId);
        list.style.setProperty('--t', row ? `${Math.round(row.offsetTop + 13)}px` : '0px');
      },
      // A band across the middle of the viewport: the reading line, not the whole screen.
      {
        rootMargin: [-READING_BAND + '%', '0px', -READING_BAND + '%', '0px'].join(' '),
        threshold: [0, 0.5, 1],
      },
    );
    for (const r of rows) io.observe(r);
    return () => io.disconnect();
  }, [groups]);

  const isOpen = (id: string) => !collapsed || openId === id;

  /**
   * Arrow keys move between headers; Home and End jump to the ends.
   *
   * `preventDefault` is called only on the keys this actually handles, and only when the
   * event started on a header — so `ArrowDown` anywhere else, including inside an open
   * panel, still scrolls the page.
   */
  const onKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    const target = e.target as HTMLElement;
    if (target.dataset.tlHeader === undefined) return;

    const headers = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[data-tl-header]') ?? [],
    );
    const i = headers.indexOf(target as HTMLButtonElement);
    if (i < 0) return;

    const to =
      e.key === 'ArrowDown' ? i + 1
      : e.key === 'ArrowUp' ? i - 1
      : e.key === 'Home' ? 0
      : e.key === 'End' ? headers.length - 1
      : -1;

    if (to < 0 || to >= headers.length) return;
    e.preventDefault();
    headers[to]?.focus();
  };

  return (
    <ol className="timeline" ref={listRef} onKeyDown={onKeyDown}>
      {groups.map((group) => (
        <Fragment key={group.stopId + group.span}>
          {group.label ? (
            // An era caption, not a heading: it names a run of the rail, and the rail is
            // one list. Its tick hangs off the same spine as every row, which is what
            // keeps it part of the line rather than a label floating beside it.
            <li className="tl-era">
              <span className="tl-era-label">{group.label}</span>
              <span className="tl-era-span">{group.span}</span>
            </li>
          ) : null}
          {group.entries.map((entry) => {
            const open = isOpen(entry.id);
            return (
              // The row's id IS the memory's id, exactly as the cards do, so a citation
              // or a pulse can address the row an answer came from.
              <li
                className="tl-row"
                id={entry.id}
                key={entry.id}
                data-open={open || undefined}
                data-active={activeId === entry.id || undefined}
                data-nested={entry.nested || undefined}
              >
                <button
                  type="button"
                  data-tl-header=""
                  id={`tl-b-${entry.id}`}
                  aria-expanded={open}
                  aria-controls={`tl-p-${entry.id}`}
                  onClick={() => setOpenId((cur) => (cur === entry.id ? null : entry.id))}
                >
                  <span className="tl-year">{periodLabel(entry.period)}</span>
                  <span className="tl-title">{entry.title}</span>
                  <span className="tl-summary">{entry.summary}</span>
                  {/* The affordance. Rotated by CSS off aria-expanded, so the mark and
                      the state cannot disagree. */}
                  <span className="tl-mark" aria-hidden="true" />
                </button>
                <div id={`tl-p-${entry.id}`} role="region" aria-labelledby={`tl-b-${entry.id}`}>
                  <div className="tl-panel-inner">
                    <p>{entry.body}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </Fragment>
      ))}
    </ol>
  );
}
