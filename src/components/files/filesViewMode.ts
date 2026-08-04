'use client';

import { useSyncExternalStore } from 'react';

// 'table'   — dense rows with every field that matters (format, size, agent, dates).
// 'compact' — a thumbnail wall, up to 8 per row: for finding an image by sight.
// 'cards'   — the roomy cards: preview plus every chip, few per row.
export type FilesViewMode = 'table' | 'compact' | 'cards';

const STORAGE_KEY = 'files:view-mode';
const CHANGE_EVENT = 'files:view-mode-change';

const parseMode = (value: string | null): FilesViewMode | null =>
  value === 'table' || value === 'compact' || value === 'cards' ? value : null;

// Same shape as the sidebar collapse flag and the dashboard view mode: an
// external store, so no setState-in-effect, SSR-safe, and synced across tabs.
const modeStore = {
  subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener(CHANGE_EVENT, callback);
      window.removeEventListener('storage', callback);
    };
  },
  getSnapshot: (): FilesViewMode => parseMode(localStorage.getItem(STORAGE_KEY)) ?? 'cards',
  getServerSnapshot: (): FilesViewMode => 'cards',
  set(mode: FilesViewMode) {
    localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  },
};

export function useFilesViewMode() {
  const mode = useSyncExternalStore(
    modeStore.subscribe,
    modeStore.getSnapshot,
    modeStore.getServerSnapshot,
  );
  return { mode, setMode: modeStore.set };
}
