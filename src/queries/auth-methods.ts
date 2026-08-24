import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';

export const authMethodKeys = {
  all: ['auth-methods'] as const,
  list: () => [...authMethodKeys.all, 'list'] as const,
};

// Nothing here changes on its own: a way in appears or disappears only because
// this person just did something about it. A short staleTime covers the other
// tab, and there is nothing to poll for.
export const authMethodsOptions = () =>
  queryOptions({
    queryKey: authMethodKeys.list(),
    queryFn: () => apiService.getAuthMethods(),
    staleTime: 30 * 1000,
  });

/**
 * Deliberately non-suspense, like the device list next to it: this is one card
 * on the settings page, and failing to load it must not blank the page.
 */
export function useAuthMethodsQuery() {
  return useQuery(authMethodsOptions());
}

export function useAuthMethodCacheActions() {
  const queryClient = useQueryClient();
  return {
    // Linking, unlinking and removing a password all rewrite one row of a short
    // unpaged list — re-reading it is cheaper than reasoning about which.
    invalidateAuthMethods: () => queryClient.invalidateQueries({ queryKey: authMethodKeys.all }),
  };
}
