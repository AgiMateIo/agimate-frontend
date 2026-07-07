import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { LlmProviderResponse } from '@/types';

export const llmProviderKeys = {
  all: ['llm-providers'] as const,
  list: () => [...llmProviderKeys.all, 'list'] as const,
};

export function useLlmProvidersQuery() {
  return useSuspenseQuery({
    queryKey: llmProviderKeys.list(),
    queryFn: () => apiService.getLlmProviders(),
  });
}

export function useLlmProviderCacheActions() {
  const queryClient = useQueryClient();
  return {
    // The list component performs optimistic per-item updates and hands back
    // the full next array — write it straight into the cache.
    setProviders: (providers: LlmProviderResponse[]) =>
      queryClient.setQueryData(llmProviderKeys.list(), providers),
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.all }),
  };
}
