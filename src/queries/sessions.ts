import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';

export const sessionKeys = {
  all: ['user-sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
};

// `lastSeenAt` moves whenever any device refreshes its tokens, so a list left
// open goes stale quietly; a short staleTime plus a refetch on focus is enough
// without polling — nothing here changes on its own between two glances.
export const userSessionsOptions = () =>
  queryOptions({
    queryKey: sessionKeys.list(),
    queryFn: () => apiService.getUserSessions(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

/**
 * Deliberately non-suspense, like the invite card next to it: the device list is
 * one card on a page that is also the profile, and a failure to load it must
 * stay inside that card instead of blanking the page.
 */
export function useUserSessionsQuery() {
  return useQuery(userSessionsOptions());
}

export function useSessionCacheActions() {
  const queryClient = useQueryClient();
  return {
    // Revoking removes a row and touches nothing else, but the list is a single
    // unpaged query — re-reading it is both the cheapest and the honest way to
    // land on what the server actually has (a 404 means it was already gone).
    invalidateSessions: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  };
}
