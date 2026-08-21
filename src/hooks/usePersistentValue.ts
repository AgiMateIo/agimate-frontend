'use client';

import { useSyncExternalStore } from 'react';
import type { PersistentValueStore } from '@/utils/persistentValue';

/** Current value of a persisted store, re-read when it changes in any tab. */
export function usePersistentValue<T>(store: PersistentValueStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
