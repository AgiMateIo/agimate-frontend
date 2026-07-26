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
  connections: (id: string) => [...agentKeys.detail(id), 'connections'] as const,
  llms: (id: string) => [...agentKeys.detail(id), 'llms'] as const,
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

// Connector bindings of one agent — filter option sources (tool-call logs tab).
export const agentConnectionsOptions = (agentId: string) =>
  queryOptions({
    queryKey: agentKeys.connections(agentId),
    queryFn: () => apiService.getAgentConnections(agentId),
  });

// Model bindings of one agent, keyed by purpose. A zero-binding agent gets a
// single synthetic PLATFORM row back — never a real row, see AgentLlmSource.
export const agentLlmsOptions = (agentId: string) =>
  queryOptions({
    queryKey: agentKeys.llms(agentId),
    queryFn: () => apiService.getAgentLlms(agentId),
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

// Suspense variant for the detail view page (rendered inside ErrorBoundary + Suspense).
export function useAgentDetailSuspenseQuery(id: string) {
  return useSuspenseQuery(agentDetailOptions(id));
}

// Non-suspense variant for the edit page, which seeds form state from the data
// and renders its own loading/error UI.
export function useAgentDetailQuery(id: string) {
  return useQuery(agentDetailOptions(id));
}

export function useAgentCacheActions() {
  const queryClient = useQueryClient();
  return {
    invalidateAgent: (id: string) =>
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) }),
    invalidateAgentLlms: (id: string) =>
      queryClient.invalidateQueries({ queryKey: agentKeys.llms(id) }),
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: agentKeys.all }),
  };
}
