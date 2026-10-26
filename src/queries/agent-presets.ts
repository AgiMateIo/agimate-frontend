import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { PresetCatalogLocale } from '@/types';

export const agentPresetKeys = {
  all: ['agent-presets'] as const,
  list: () => [...agentPresetKeys.all, 'list'] as const,
  admin: (locale: PresetCatalogLocale) => [...agentPresetKeys.all, 'admin', locale] as const,
};

export const agentPresetsOptions = () =>
  queryOptions({
    queryKey: agentPresetKeys.list(),
    queryFn: () => apiService.getAgentPresets(),
    // The gallery is static per deploy; avoid refetching while the wizard is open.
    staleTime: 5 * 60 * 1000,
  });

// Non-suspense: the wizard renders its own loading/error states.
export function useAgentPresetsQuery() {
  return useQuery(agentPresetsOptions());
}

export const adminAgentPresetsOptions = (locale: PresetCatalogLocale) =>
  queryOptions({
    queryKey: agentPresetKeys.admin(locale),
    queryFn: () => apiService.getAdminAgentPresets(locale),
  });

export function useAdminAgentPresetsQuery(locale: PresetCatalogLocale) {
  return useSuspenseQuery(adminAgentPresetsOptions(locale));
}

// A saved preset changes the wizard's gallery too, so everything goes.
export function useAgentPresetCacheActions() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: agentPresetKeys.all }),
  };
}
