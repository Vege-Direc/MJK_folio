// Tiny typed event bus: chat stream events → WebGL scene + panel components.
// Listeners subscribe via useBus() in client components.

type Events = {
  'section:activate': { section: string; memoryId?: string };
  'pulse:fire': { from: [number, number, number]; to: string };
  'panel:open': { section: string; content: string };
  'panel:close': void;
};

type Handler<K extends keyof Events> = (payload: Events[K]) => void;

const listeners: { [K in keyof Events]?: Set<Handler<K>> } = {};

export function on<K extends keyof Events>(k: K, fn: Handler<K>) {
  (listeners[k] ??= new Set()).add(fn);
  return () => listeners[k]?.delete(fn);
}

export function emit<K extends keyof Events>(k: K, payload: Events[K]) {
  listeners[k]?.forEach((fn) => fn(payload as any));
}
