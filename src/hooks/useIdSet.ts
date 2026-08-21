import { useCallback, useState } from 'react';

/**
 * A set of ids kept in state: which rows are expanded, which ones have an
 * action in flight. `add` and `remove` return the previous set untouched when
 * nothing would change, so a repeated call costs no render.
 *
 * Deliberately not a `run(id, fn)` wrapper around the pair. What happens between
 * the add and the remove differs at every call site — a refetch, an optimistic
 * patch with a rollback, a second read on a timer — and one caller keeps the id
 * after a *successful* call on purpose: cancelling a run only records a request,
 * so the row has to keep reading "stopping" until the list refreshes.
 */
export function useIdSet() {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  const add = useCallback((id: string) => {
    setIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const remove = useCallback((id: string) => {
    setIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    // The set itself, for the rare consumer that needs its identity as a
    // dependency rather than a membership test.
    ids,
    size: ids.size,
    has: (id: string) => ids.has(id),
    add,
    remove,
    toggle,
  };
}
