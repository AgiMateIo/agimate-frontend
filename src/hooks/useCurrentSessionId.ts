'use client';

import { useSyncExternalStore } from 'react';
import { currentSessionIdStore } from '@/services/currentSession';

// Id of the sign-in this browser is using, or null when it is not known yet
// (nothing has refreshed tokens since the backend started returning it). Callers
// must treat null as "cannot tell which row is mine", never as "no row is mine".
export function useCurrentSessionId(): string | null {
  return useSyncExternalStore(
    currentSessionIdStore.subscribe,
    currentSessionIdStore.getSnapshot,
    currentSessionIdStore.getServerSnapshot,
  );
}
