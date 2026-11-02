import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type {
  AgentLlmPurpose,
  CreateLlmQuotaRequest,
  LlmProviderModelResponse,
  LlmProviderResponse,
  PlatformLlmEntryResponse,
  UpdateLlmQuotaRequest,
} from '@/types';

export const llmProviderKeys = {
  all: ['llm-providers'] as const,
  list: () => [...llmProviderKeys.all, 'list'] as const,
  usage: () => [...llmProviderKeys.all, 'usage'] as const,
  quotas: (providerId: string) => [...llmProviderKeys.all, 'quotas', providerId] as const,
  models: (providerId: string) => [...llmProviderKeys.all, 'models', providerId] as const,
  catalog: () => [...llmProviderKeys.all, 'catalog'] as const,
  // The platform's purpose chains, flat and admin-only.
  platformPurposes: () => [...llmProviderKeys.all, 'platform-purposes'] as const,
};

export function llmProviderCatalogOptions() {
  return queryOptions({
    queryKey: llmProviderKeys.catalog(),
    queryFn: () => apiService.getLlmProviderCatalog(),
    // Ships with the installation; nothing to gain from refetching mid-form.
    staleTime: 5 * 60 * 1000,
  });
}

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

// ADMIN only. One flat list: rows carry their purpose and priority, so the
// screen groups them by purpose without a second request per purpose.
export function platformLlmsOptions() {
  return queryOptions({
    queryKey: llmProviderKeys.platformPurposes(),
    queryFn: () => apiService.getPlatformLlms(),
  });
}

export function useLlmProvidersQuery() {
  return useSuspenseQuery(llmProvidersListOptions());
}

// Non-suspense: the add-provider modal renders its own loading state and treats
// both an empty catalog and a failed fetch the same way — a blank manual form.
export function useLlmProviderCatalogQuery() {
  return useQuery(llmProviderCatalogOptions());
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
    // One row changed (a toggle, an edit): replace it in place, so a page that
    // renders a subset of the list never drops the rows it filtered out.
    setProvider: (provider: LlmProviderResponse) =>
      queryClient.setQueryData<LlmProviderResponse[]>(llmProviderKeys.list(), (prev) =>
        prev ? prev.map((p) => (p.id === provider.id ? provider : p)) : prev
      ),
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
    // Platform usage rows are matched by provider name and only enabled providers
    // appear at all, so a rename or an enable/disable stales them.
    invalidateUsage: () =>
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.usage() }),
    // PUT answers with the purpose's whole chain; replace that purpose's rows in
    // the flat list. Cross-purpose order does not matter — the page groups.
    setPlatformPurpose: (purpose: AgentLlmPurpose, entries: PlatformLlmEntryResponse[]) =>
      queryClient.setQueryData<PlatformLlmEntryResponse[]>(
        llmProviderKeys.platformPurposes(),
        (prev) => (prev ? [...prev.filter((e) => e.purpose !== purpose), ...entries] : prev),
      ),
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: llmProviderKeys.all }),
  };
}
