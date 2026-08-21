'use client';

import { usePersistentValue } from '@/hooks/usePersistentValue';
import { createPersistentValue } from '@/utils/persistentValue';

// 'table'   — dense rows with every field that matters (format, size, agent, dates).
// 'compact' — a thumbnail wall, up to 8 per row: for finding an image by sight.
// 'cards'   — the roomy cards: preview plus every chip, few per row.
export type FilesViewMode = 'table' | 'compact' | 'cards';

const modeStore = createPersistentValue<FilesViewMode>({
  key: 'files:view-mode',
  event: 'files:view-mode-change',
  fallback: 'cards',
  parse: (raw) => (raw === 'table' || raw === 'compact' || raw === 'cards' ? raw : null),
  serialize: (mode) => mode,
});

export function useFilesViewMode() {
  return { mode: usePersistentValue(modeStore), setMode: modeStore.set };
}
