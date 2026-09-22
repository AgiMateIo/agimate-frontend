'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getResyncEpoch, subscribePersonalChannel, subscribeResync } from './personalChannel';

/**
 * Opens the personal channel as soon as the dashboard shell mounts, before any
 * screen asks for it — so an event isn't missed in the gap between signing in
 * and the first listener — and re-reads every screen on a failed recovery:
 * active queries refetch, inactive ones are marked stale for their next mount.
 */
export function usePersonalChannel(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const stop = subscribePersonalChannel(() => {});
    const stopResync = subscribeResync(() => {
      void queryClient.invalidateQueries();
    });
    return () => {
      stop();
      stopResync();
    };
  }, [enabled, queryClient]);
}

// Changes after every failed recovery — a key for state that lives outside
// React Query and has to be rebuilt from REST (the open chat's thread).
export function useResyncEpoch(): number {
  return useSyncExternalStore(subscribeResync, getResyncEpoch, () => 0);
}
