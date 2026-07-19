import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type {
  CreateLlmQuotaRequest,
  LlmProviderModelResponse,
  LlmProviderResponse,
  UpdateLlmQuotaRequest,
} from '@/types';

export const llmProviderKeys = {
  all: ['llm-providers'] as const,
  list: () => [...llmProviderKeys.all, 'list'] as const,
  usage: () => [...llmProviderKeys.all, 'usage'] as const,
  quotas: (providerId: string) => [...llmProviderKeys.all, 'quotas', providerId] as const,
  models: (providerId: string) => [...llmProviderKeys.all, 'models', providerId] as const,
};

export function llmProvidersListOptions() {
  return queryOptions({
    queryKey: llmProviderKeys.list(),
    queryFn: () => apiService.getLlmProviders(),
  });
}

export function llmProviderModelsOptions(providerId: string) {
  return queryOptions({
    queryKey: llmProviderKeys.models(providerId),
    queryFn: () => apiService.getLlmProviderModels(providerId),
  });
}

export function useLlmProvidersQuery() {
  return useSuspenseQuery(llmProvidersListOptions());
}

// Non-suspense: used in modals where the provider is picked interactively.
export function useLlmProviderModelsQuery(providerId: string | null | undefined) {
  return useQuery({
    ...llmProviderModelsOptions(providerId ?? ''),
    enabled: !!providerId,
  });
}

// Non-suspense: usage is supplementary — a failure or slow response must never
// block the surfaces that host it (agent models tab, dashboard widget).
export function useLlmUsageQuery() {
  return useQuery({
    queryKey: llmProviderKeys.usage(),
    queryFn: () => apiService.getLlmUsage(),
    staleTime: 30_000,
  });
}

export function useLlmProviderQuotasQuery(providerId: string) {
  return useQuery({
    queryKey: llmProviderKeys.quotas(providerId),
    queryFn: () => apiService.getLlmProviderQuotas(providerId),
  });
}

export function useCreateLlmQuotaMutation(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLlmQuotaRequest) => apiService.createLlmProviderQuota(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.quotas(providerId) });
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.usage() });
    },
  });
}

export function useUpdateLlmQuotaMutation(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quotaId, data }: { quotaId: string; data: UpdateLlmQuotaRequest }) =>
      apiService.updateLlmProviderQuota(providerId, quotaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.quotas(providerId) });
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.usage() });
    },
  });
}

export function useDeleteLlmQuotaMutation(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotaId: string) => apiService.deleteLlmProviderQuota(providerId, quotaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.quotas(providerId) });
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.usage() });
    },
  });
}

export function useLlmProviderCacheActions() {
  const queryClient = useQueryClient();
  return {
    // The list component performs optimistic per-item updates and hands back
    // the full next array — write it straight into the cache.
    setProviders: (providers: LlmProviderResponse[]) =>
      queryClient.setQueryData(llmProviderKeys.list(), providers),
    // Refresh/extra-body responses return full registry rows — write them straight in.
    setProviderModels: (providerId: string, models: LlmProviderModelResponse[]) =>
      queryClient.setQueryData(llmProviderKeys.models(providerId), models),
    setProviderModel: (providerId: string, model: LlmProviderModelResponse) =>
      queryClient.setQueryData<LlmProviderModelResponse[]>(llmProviderKeys.models(providerId), (prev) => {
        if (!prev) return prev;
        return prev.some((m) => m.id === model.id)
          ? prev.map((m) => (m.id === model.id ? model : m))
          : [...prev, model];
      }),
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.all }),
  };
}
