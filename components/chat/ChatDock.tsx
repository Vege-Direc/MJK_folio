'use client';

import { useEffect, useRef, useState } from 'react';
import AnswerBlock from './AnswerBlock';
import { useAsk } from './ChatProvider';
import MotionToggle from './MotionToggle';
import SuggestedPrompts from './SuggestedPrompts';
import { useAnswerTarget } from './useAnswerTarget';

/**
 * Persistent chat dock. Never hidden. Full-width bar across the viewport bottom.
 *
 * The dock owns the input and nothing else. The answer docks into the stop it belongs to
 * (see AnswerPortal); the dock only shows it here, compactly, when no stop container is on
 * the page to receive it. Palette: DOM tokens only, never the WebGL orange.
 */
export default function ChatDock() {
  const { answer, asking, error, ask, draft, setDraft } = useAsk();
  const docked = useAnswerTarget(answer?.envelope?.stopId ?? null) !== null;
  /*
   * The field's value lives in `ChatProvider` now, not here.
   *
   * A card in `<main>` prefills it and sends in the same action, so the visitor sees their
   * question arrive in the box and run — which is the only way anything on this page teaches
   * what the box is for. Nothing else about this component changed: the ResizeObserver, the
   * keyboard inset and type-to-focus never read the value, and `SuggestedPrompts` still goes
   * through `onPick`.
   */
  const input = draft;
  const setInput = setDraft;
  const inputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  /**
   * Publish the dock's real height as `--dock-h`.
   *
   * Every stop reserves its bottom padding from this. The two numbers that used to
   * guess at it were tuned against a ~110px dock and the dock is 173px now, which is
   * how an answer's verdict line and its citations ended up rendering inside the dock's
   * own black gradient — present, correct, and invisible. A ResizeObserver is the only
   * honest source, because the height changes with the wrapped prompt row, the error
   * line and the viewport.
   */
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const publish = () => {
      document.documentElement.style.setProperty('--dock-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    };
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    publish();
    return () => ro.disconnect();
  }, []);

  /**
   * Lift the dock clear of the on-screen keyboard, by measuring rather than computing.
   *
   * MJK reported this: "the chatbox disappears on mobile when I click to type and then
   * reappears only after i click the send key". The old version computed the inset as
   * `innerHeight - vv.height - vv.offsetTop` and applied it on `resize` and `scroll`.
   * The arithmetic is the textbook one and it is right when it is fed clean numbers. The
   * bug is that it only ever reacted to an event, and clamped disagreement to zero: iOS
   * fires `resize` carrying PRE-keyboard metrics and then does not reliably fire a
   * settled one afterwards, so the inset stayed 0, React stripped the transform, and the
   * dock sat under the keyboard for the whole typing session. It came back on send
   * because dismissing the keyboard finally produced an event it could believe. Measured
   * against the real component with a synthetic visual viewport at 390x664: three of five
   * event sequences left 332px of dock — the input and the send control — below the
   * visible band.
   *
   * The reason not to fix the formula is one row of that trace. On iOS 26 a bottom-fixed
   * bar can land at a `bottom` of 847 while `innerHeight` is 932 and `offsetTop + height`
   * is 604: it coincides with neither, so any formula built on an assumption about what
   * the fixed containing block is will be wrong on some configuration, and wrong
   * silently. So this does not ask where the dock should be. It measures where the dock
   * IS, and closes the gap to the bottom of the visible band. That converges in one step
   * and needs no model of the browser's viewport arithmetic at all.
   *
   * The settle loop is the second half. WebKit bugs 237851, 265578 and 226689 between
   * them describe stale metrics, resizes that only arrive when the keyboard animation
   * ends, and spurious resizes back to full height. A bounded rAF re-read after each
   * trigger survives all three. It writes only when the gap is at least a pixel, so it
   * costs one `getBoundingClientRect` per frame for at most 0.7s and nothing at rest.
   */
  const [kbInset, setKbInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    const dock = dockRef.current;
    const input = inputRef.current;
    if (!vv || !dock) return;

    let raf = 0;
    let until = 0;

    const apply = () => {
      const band = vv.offsetTop + vv.height;
      const delta = dock.getBoundingClientRect().bottom - band;
      // Under a pixel is converged. The guard also stops the loop oscillating around a
      // fractional gap, which would write state every frame for the whole settle window.
      if (Math.abs(delta) < 1) return;
      setKbInset((prev) => Math.max(0, Math.round(prev + delta)));
    };

    const settle = (ms: number) => {
      until = Math.max(until, performance.now() + ms);
      if (raf) return;
      const tick = () => {
        apply();
        raf = performance.now() < until ? requestAnimationFrame(tick) : 0;
      };
      raf = requestAnimationFrame(tick);
    };

    // The windows are the keyboard's own animation, roughly: opening is slower than
    // closing, and a viewport scroll settles fastest of the three.
    const onResize = () => {
      apply();
      settle(400);
    };
    const onScroll = () => {
      apply();
      settle(200);
    };
    const onFocus = () => settle(700);
    const onBlur = () => settle(400);

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onScroll);
    input?.addEventListener('focus', onFocus);
    input?.addEventListener('blur', onBlur);
    apply();

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onScroll);
      input?.removeEventListener('focus', onFocus);
      input?.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      // Space scrolls a long-scroll page. Stealing it to focus the input takes the
      // primary way through this site away from anyone who reads with the keyboard.
      if (e.key === ' ') return;
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (value: string) => {
    const question = value.trim();
    if (!question || asking) return;
    ask(question);
    setInput('');
  };

  const showInline = answer !== null && !docked;

  return (
    <div
      ref={dockRef}
      className="fixed inset-x-0 bottom-0 z-50"
      style={kbInset ? { transform: `translateY(-${kbInset}px)` } : undefined}
    >
      {/*
        The veil, which has to occlude the page as well as the scene.

        It used to be `from-bg via-bg/85 to-transparent`, which reaches full transparency
        at its own top edge — so a stop's content scrolling up behind the dock stayed
        completely visible through it. On a phone that printed the timeline's fourth entry
        on top of the prompt row: "Kinnect India" and "Senior Manager, then Account
        Director…" over "Walk me through the arc", both legible, neither readable. The
        bottom padding every stop reserves from `--dock-h` keeps the *end* of a stop
        clear; nothing was keeping its middle clear on the way past.

        So the gradient is solid across the rows that carry type and feathers only above
        them. No blur: this is the same scene the reading halo exists to avoid smearing.
      */}
      <div className="dock-veil" />

      <div className="relative mx-auto max-w-5xl px-6 md:px-10 pt-6 pb-4">
        {/*
          A transport failure is the visitor's problem to act on, not the system's state
          to narrate. This used to shout "⟶ THE MIND IS RESTING. THE PAGE STILL SCROLLS."
          in caps at someone who had asked a question and got nothing — explaining an
          internal condition they never enquired about, in the register of a status
          light. One quiet sentence, and it says what to do rather than what broke.
        */}
        {error && (
          <p className="pb-4 text-sm text-[color:var(--color-type-dim)]" role="status">
            Ask again in a moment.
          </p>
        )}

        {showInline && !error && (
          <div className="max-h-[45vh] overflow-y-auto pb-4">
            <AnswerBlock answer={answer} compact />
          </div>
        )}

        {/*
          The prompts used to disappear the moment an answer existed, and stay gone.
          That was wrong twice over. A visitor who has just read one answer is exactly
          the visitor most likely to want a second, and taking away the four things
          worth asking leaves them an empty field and no idea what this thing knows.

          It was also costing a relayout: losing the row changes the dock's height,
          `--dock-h` is republished, and every one of the nine stops recomputes the
          bottom padding derived from it — nine sections relaid out at the exact moment
          the page is also flying to a stop and streaming text into it.

          They still yield when the answer has nowhere else to go and is rendering here.
        */}
        {!showInline && (
          <SuggestedPrompts
            frozen={input.length > 0 || asking}
            onPick={(p) => {
              setInput(p);
              inputRef.current?.focus();
            }}
          />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-4 border-t border-[color:var(--color-rule)] pt-4"
        >
          <span
            className={`text-[13px] transition-colors ${
              asking ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-type-dim)]'
            }`}
            aria-live="polite"
          >
            {asking ? 'Answering' : 'Ask'}
          </span>
          {/*
            No `autoFocus`. It put the caret in this field on load, which took Space and
            PageDown — the primary way through a nine-screen scroll-driven page — away
            from every keyboard visitor, unconditionally. The global keydown handler two
            dozen lines up carries a comment explaining that Space must not be stolen,
            and then `autoFocus` on this element stole it. Type-to-focus already buys the
            discoverability, and it correctly exempts Space.

            The focus ring is not decoration either: this is the only text field on the
            site and it had `outline: none` with nothing put back, so a keyboard visitor
            could not see where they were.
          */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the mind."
            maxLength={500}
            aria-label="Ask a question about Mathew"
            className="ask-input flex-1 bg-transparent text-[color:var(--color-type)] placeholder:text-[color:var(--color-type-dim)] outline-none py-3 text-base md:text-lg font-serif"
          />
          <button type="submit" className="dock-send">
            Send
          </button>
          {/*
            Last, deliberately. See MotionToggle for the reasoning: always available, no
            added height, and after the input in the tab order.
          */}
          <MotionToggle />
        </form>
      </div>
    </div>
  );
}
