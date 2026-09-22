import { useState } from 'react';

/**
 * The selected row of a freshest-first list that moves under the reader.
 *
 * Nothing picked yet — or the pick is gone from the list — means the newest
 * row, and that fallback is then pinned (a state update during render, not an
 * effect), so a live row climbing to the top doesn't swap what is on screen.
 * A list replaced wholesale (another channel) lands on its own newest row the
 * same way.
 */
export function usePinnedSelection<T extends { id: string }>(rows: T[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;
  if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  return [selected, setSelectedId] as const;
}
