/**
 * A module-level handle to the running scene, so client code that is nowhere near
 * `MindCanvas` can fly the camera or fire a pulse.
 *
 * This is a registry, not an event bus. `lib/bus.ts` was the bus: a typed emitter with
 * two event names, one of which (`pulse:fire`) nothing ever emitted and the other of
 * which (`section:activate`) stopped being emitted when the model's routing tool was
 * removed. Replacing it with a registry is the honest shape — the scene is one object
 * with methods, and callers want to call them, not to describe an intention and hope.
 *
 * The scene loads after first paint, so a caller can arrive before it exists. `getMind`
 * returns null in that window; `onMindReady` fires immediately if the scene is already
 * up, and returns an unsubscribe safe to use as a useEffect cleanup.
 */
import type { MindHandle } from './scene';

let mind: MindHandle | null = null;
const waiting = new Set<(handle: MindHandle) => void>();

/** Called by MindCanvas: with the handle on mount, with null on dispose. */
export function setMind(handle: MindHandle | null): void {
  mind = handle;
  if (!handle) return;
  // Copy first: a callback that unsubscribes itself must not mutate the set mid-iteration.
  for (const cb of [...waiting]) cb(handle);
  waiting.clear();
}

export function getMind(): MindHandle | null {
  return mind;
}

export function onMindReady(cb: (handle: MindHandle) => void): () => void {
  if (mind) {
    cb(mind);
    return () => {};
  }
  waiting.add(cb);
  return () => {
    waiting.delete(cb);
  };
}
