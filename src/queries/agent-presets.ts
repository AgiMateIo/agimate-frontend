import { queryOptions, useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';

export const agentPresetKeys = {
  all: ['agent-presets'] as const,
  list: () => [...agentPresetKeys.all, 'list'] as const,
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
