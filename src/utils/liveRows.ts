// Places a live row in a freshest-first list: replaced in place, or moved to
// the top when its activity changed. `undefined` = list left untouched.
export function placeRow<T extends { lastActivityAt: string | null }>(
  rows: T[],
  row: T,
  keyOf: (r: T) => string,
  isNew: boolean,
): T[] | undefined {
  const key = keyOf(row);
  const at = rows.findIndex((r) => keyOf(r) === key);
  if (at >= 0) {
    if (rows[at].lastActivityAt === row.lastActivityAt) {
      const next = [...rows];
      next[at] = row;
      return next;
    }
    return [row, ...rows.filter((r) => keyOf(r) !== key)];
  }
  const head = rows[0];
  if (isNew || !head || (row.lastActivityAt ?? '') > (head.lastActivityAt ?? '')) return [row, ...rows];
  return undefined;
}
