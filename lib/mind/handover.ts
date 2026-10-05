/**
 * The handshake between the intro gate and the scene, in two signals that travel in
 * opposite directions.
 *
 * WHY THIS IS NOT `controller.ts`. That module is a registry for a *running* scene: it
 * exists so a caller anywhere on the page can fly the camera. Both signals here are
 * about the window *before* there is a scene to register, and one of them is about the
 * scene's own CSS opacity rather than about the scene at all. Putting them in the
 * controller would give `onMindReady` a sibling that means something subtly different,
 * which is exactly the confusion the second signal exists to prevent.
 *
 * ---
 *
 * **Down: `whenSceneMayBuild`.** The scene chunk is fetched the instant `MindCanvas`
 * mounts, but `createMind` is hundreds of milliseconds of main thread — it builds the
 * near network, the tube geometry and the nebula — and running it under the gate's
 * opening beat would jank the one animation the visitor is being asked to watch. So the
 * gate holds the *build* (never the fetch) until it reaches its HOLD, which is the beat
 * where the portrait is nearly still and jank is least visible. Without a gate this
 * resolves immediately and nothing is deferred.
 *
 * **Up: `sceneRevealing`.** `onMindReady` is NOT "the scene is visible". `setMind()`
 * fires while the canvas is still at `opacity: 0`, and `scene.ts` then waits up to
 * `T3_GRACE_MS` (1,200ms on desktop) for the far field before it starts a `REVEAL_MS`
 * (700ms) fade. A gate that ended on `onMindReady` would hand the visitor a black canvas
 * for up to 1,900ms. `sceneRevealing` fires on the frame the fade actually starts, so the
 * gate's tail and the scene's own ramp overlap rather than queue.
 *
 * It also fires when nothing will ever fade up — no WebGL, a lost context, an import that
 * 404s. "The scene is not coming" and "the scene is here" are the same instruction to the
 * gate: stop waiting. A gate that could only be released by success would sit at its
 * ceiling on every machine without WebGL.
 */

type Cb = () => void;

/**
 * Whether the gate is on screen, asked of the DOM rather than of a module variable.
 *
 * The decision is made by a synchronous script in the document before anything is
 * hydrated — it has to be, or a returning visitor gets a frame of an intro they already
 * dismissed — and it publishes itself as `data-intro` on `<html>`. Reading it back is
 * what keeps one decision from being made twice with two different answers.
 */
export function introRunning(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.intro === 'on';
}

let buildReleased = false;
const buildWaiting = new Set<Cb>();

/**
 * The safety net, and it is not decoration.
 *
 * If the gate throws between mount and its HOLD — a canvas context that cannot be got, a
 * portrait that fails to decode — nothing would ever call `releaseSceneBuild`, and the
 * scene would never build on the one page view where the visitor is staring at a
 * full-screen overlay waiting for it. The scene is the site; the gate is an introduction
 * to it. So the deadline is generous enough never to fire during a healthy run (the HOLD
 * begins at 620ms) and short enough that a broken gate costs a beat rather than the page.
 */
const BUILD_DEADLINE_MS = 1600;

/** The gate has reached its HOLD. Idempotent: React 19 strict mode calls it twice. */
export function releaseSceneBuild(): void {
  if (buildReleased) return;
  buildReleased = true;
  for (const cb of [...buildWaiting]) cb();
  buildWaiting.clear();
}

/**
 * Resolves when the expensive part of the scene may take the main thread.
 *
 * Immediately when no gate is running, which is most visits — a returning visitor,
 * reduced motion, a hash deep link, JavaScript that got this far but no further.
 */
export function whenSceneMayBuild(): Promise<void> {
  if (buildReleased || !introRunning()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      buildWaiting.delete(done);
      resolve();
    }, BUILD_DEADLINE_MS);
    function done() {
      clearTimeout(timer);
      resolve();
    }
    buildWaiting.add(done);
  });
}

let revealed = false;
const revealWaiting = new Set<Cb>();

/**
 * The scene's canvas has started fading up — or never will. Idempotent, and it stays
 * latched: a listener that subscribes afterwards is told at once rather than waiting for
 * an event that has already happened.
 */
export function sceneRevealing(): void {
  if (revealed) return;
  revealed = true;
  for (const cb of [...revealWaiting]) cb();
  revealWaiting.clear();
}

/** Fires immediately if the scene is already revealing. Returns an unsubscribe. */
export function onSceneRevealing(cb: Cb): () => void {
  if (revealed) {
    cb();
    return () => {};
  }
  revealWaiting.add(cb);
  return () => {
    revealWaiting.delete(cb);
  };
}

/*
 * Deliberately no reset, and React 19 strict mode is the reason to state it rather than
 * the reason to add one. Both of these are facts about the page view, not about the
 * `MindCanvas` instance: the gate reached its HOLD, and something started fading up.
 * Strict mode's second mount re-runs `createMind` and fires `onRevealStart` again, which
 * is a no-op here — correct. A reset in the cleanup would instead unlatch a release the
 * gate had already granted, and the second mount would then sit out the full
 * `BUILD_DEADLINE_MS` waiting for a HOLD that had already been and gone.
 */
