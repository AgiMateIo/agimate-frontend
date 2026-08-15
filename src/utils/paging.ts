import type { PagedResponse } from '@/types';

/**
 * Drops repeats while keeping the first occurrence of each id.
 *
 * Page-number paging over a live list needs this: rows arrive while the user is
 * paging, everything below shifts down, and a row already shown on page N comes
 * back on page N+1. Sessions shift hardest — `lastMessageAt` sends an active one
 * back to the top of page 0 — but message history does it too.
 */
export function dedupeById<T>(items: T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = getId(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * `getNextPageParam` for every paged endpoint: the next page number, or
 * `undefined` once the last one is in (which is what stops useInfiniteQuery
 * from offering more).
 *
 * Both numbers come off the response on purpose — the backend silently caps
 * `size` at 100, so a bigger request yields more pages than the caller asked for.
 */
export const nextPageParam = (last: PagedResponse<unknown>): number | undefined =>
  last.number + 1 < last.totalPages ? last.number + 1 : undefined;
