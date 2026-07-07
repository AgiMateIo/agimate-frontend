import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (teamId?: string) => [...agentKeys.lists(), teamId ?? 'all'] as const,
};

export const agentsListOptions = (teamId?: string) =>
  queryOptions({
    queryKey: agentKeys.list(teamId),
    queryFn: () =>
      apiService.getAgentsList(teamId ? { agenticTeamId: teamId } : undefined),
  });

export function useAgentsListQuery(teamId?: string) {
  return useSuspenseQuery(agentsListOptions(teamId));
}
