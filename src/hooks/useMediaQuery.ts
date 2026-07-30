'use client';

import { useCallback, useSyncExternalStore } from 'react';

// One MediaQueryList per query, kept module-level so getSnapshot stays cheap and
// referentially stable across renders.
const lists = new Map<string, MediaQueryList>();

const getList = (query: string): MediaQueryList => {
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
};

// Viewport queries as an external store: no setState-in-effect, SSR renders
// `serverFallback` and hydration corrects it. Use only for behaviour CSS can't
// express (JS branching on viewport) — plain layout still belongs in Tailwind
// breakpoints, which need no JS at all.
export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const list = getList(query);
      list.addEventListener('change', callback);
      return () => list.removeEventListener('change', callback);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => getList(query).matches,
    () => serverFallback,
  );
}

// Tailwind's `lg` — the breakpoint where the sidebar stops being a drawer.
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)', true);
