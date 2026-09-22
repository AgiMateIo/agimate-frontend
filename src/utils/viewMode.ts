import { createPersistentValue } from './persistentValue';

// The three ways a list of things can be laid out. Shared because the choice is
// the same question everywhere it is asked:
// 'table'   — dense rows with every field worth comparing across items.
// 'compact' — a wall of small tiles: for finding one by sight.
// 'cards'   — roomy cards: picture plus every chip, few per row.
export type ViewMode = 'table' | 'compact' | 'cards';

function parseViewMode(raw: string | null): ViewMode | null {
  return raw === 'table' || raw === 'compact' || raw === 'cards' ? raw : null;
}

/** A per-section view-mode preference in localStorage, keyed by `<section>:view-mode`. */
export function createViewModeStore(key: string) {
  return createPersistentValue<ViewMode>({
    key,
    event: `${key}-change`,
    fallback: 'cards',
    parse: parseViewMode,
    serialize: (mode) => mode,
  });
}
