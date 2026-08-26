// Tiny typed event bus: chat stream events → WebGL scene + section components.
// Listeners subscribe via on() in client components.

type Events = {
  'section:activate': { section: string; memoryId?: string };
  'pulse:fire': { from: [number, number, number]; to: string };
};

type Handler<K extends keyof Events> = (payload: Events[K]) => void;

// Stored untyped; the exported on/emit signatures are the type boundary.
const listeners = new Map<keyof Events, Set<(payload: never) => void>>();

/** Subscribe. Returns an unsubscribe function safe to use as a useEffect cleanup. */
export function on<K extends keyof Events>(k: K, fn: Handler<K>): () => void {
  let set = listeners.get(k);
  if (!set) {
    set = new Set();
    listeners.set(k, set);
  }
  set.add(fn as (payload: never) => void);
  return () => {
    set.delete(fn as (payload: never) => void);
  };
}

export function emit<K extends keyof Events>(k: K, payload: Events[K]): void {
  const set = listeners.get(k);
  if (!set) return;
  for (const fn of set) (fn as Handler<K>)(payload);
}
