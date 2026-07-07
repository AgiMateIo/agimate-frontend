import {
  queryOptions,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (teamId?: string) => [...agentKeys.lists(), teamId ?? 'all'] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
};

export const agentsListOptions = (teamId?: string) =>
  queryOptions({
    queryKey: agentKeys.list(teamId),
    queryFn: () =>
      apiService.getAgentsList(teamId ? { agenticTeamId: teamId } : undefined),
  });

export const agentDetailOptions = (id: string) =>
  queryOptions({
    queryKey: agentKeys.detail(id),
    queryFn: () => apiService.getAgent(id),
  });

// A large single page used to build id→agent lookup maps.
export const allAgentsOptions = () =>
  queryOptions({
    queryKey: [...agentKeys.lists(), 'all-agents'] as const,
    queryFn: () => apiService.getAgentsList({ size: 200 }),
  });

export function useAgentsListQuery(teamId?: string) {
  return useSuspenseQuery(agentsListOptions(teamId));
}

// Non-suspense: the detail pages render their own loading/error states.
export function useAgentDetailQuery(id: string) {
  return useQuery(agentDetailOptions(id));
}

export function useAgentCacheActions() {
  const queryClient = useQueryClient();
  return {
    invalidateAgent: (id: string) =>
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) }),
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: agentKeys.all }),
  };
}
