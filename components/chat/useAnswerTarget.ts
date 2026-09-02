'use client';

import { useSyncExternalStore } from 'react';

/**
 * The DOM container an answer docks into: `#answer-<stopId>`, rendered empty by every
 * stop section on the server. Read through `useSyncExternalStore` so the lookup happens
 * outside render on the client, returns `null` during SSR, and never needs a setState in
 * an effect. Nothing to subscribe to: the containers are part of the server-rendered
 * page and exist before any answer does.
 */
const subscribe = () => () => {};

export function useAnswerTarget(stopId: string | null): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => (stopId ? document.getElementById(`answer-${stopId}`) : null),
    () => null,
  );
}
