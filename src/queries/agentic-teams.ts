import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';

export const agenticTeamKeys = {
  all: ['agentic-teams'] as const,
  list: () => [...agenticTeamKeys.all, 'list'] as const,
  detail: (id: string) => [...agenticTeamKeys.all, 'detail', id] as const,
};

export const agenticTeamsListOptions = () =>
  queryOptions({
    queryKey: agenticTeamKeys.list(),
    queryFn: () => apiService.getAgenticTeams(),
  });

export const agenticTeamOptions = (id: string) =>
  queryOptions({
    queryKey: agenticTeamKeys.detail(id),
    queryFn: () => apiService.getAgenticTeam(id),
  });

export function useAgenticTeamsQuery() {
  return useSuspenseQuery(agenticTeamsListOptions());
}

export function useAgenticTeamQuery(id: string) {
  return useSuspenseQuery(agenticTeamOptions(id));
}

export function useAgenticTeamCacheActions() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: agenticTeamKeys.all }),
  };
}
