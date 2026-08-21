import {
  queryOptions,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { newestFirst } from '@/utils/date';
import type { AgentResponse, PagedResponse } from '@/types';

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (teamId?: string) => [...agentKeys.lists(), teamId ?? 'all'] as const,
  picker: (search: string, page: number, size: number) =>
    [...agentKeys.lists(), 'picker', search, page, size] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
  connections: (id: string) => [...agentKeys.detail(id), 'connections'] as const,
  skills: (id: string) => [...agentKeys.detail(id), 'skills'] as const,
  llms: (id: string) => [...agentKeys.detail(id), 'llms'] as const,
  // Keyed by the agent-connection binding id, not the agent id: policies refine
  // one binding, and the panel only ever has that id to hand.
  connectionPolicies: (agentConnectionId: string) =>
    [...agentKeys.all, 'connection-policies', agentConnectionId] as const,
};

// One page big enough to hold an agent's whole skill list: the same rows back
// both the skills section and the "N skills are not working" line on the agent
// card, and a second key would mean a second request for the same truth.
const SKILLS_PAGE_SIZE = 100;

// Newest first. The sort parameter is what makes it hold across pages; the
// select is the fallback for a backend that ignores it, so at least the page
// the user sees is ordered.
const NEWEST_FIRST = 'createdAt,desc';

const byCreatedAtDesc = (page: PagedResponse<AgentResponse>) => ({
  ...page,
  content: [...page.content].sort(newestFirst),
});

export const agentsListOptions = (teamId?: string) =>
  queryOptions({
    queryKey: agentKeys.list(teamId),
    queryFn: () =>
      apiService.getAgentsList({ agenticTeamId: teamId, sort: NEWEST_FIRST }),
    select: byCreatedAtDesc,
  });

// The agent picker (add-agent modal): searchable and paged, so page and search
// are part of the key rather than component state feeding a manual fetch.
export const agentsPickerOptions = (search = '', page = 0, size = 10) =>
  queryOptions({
    queryKey: agentKeys.picker(search, page, size),
    queryFn: () =>
      apiService.getAgentsList({ search: search || undefined, page, size }),
  });

export function useAgentsPickerQuery(search = '', page = 0, size = 10) {
  return useQuery(agentsPickerOptions(search, page, size));
}

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

// TOOL/TRIGGER allow-deny refinements of one connector binding.
export const agentConnectionPoliciesOptions = (agentConnectionId: string) =>
  queryOptions({
    queryKey: agentKeys.connectionPolicies(agentConnectionId),
    queryFn: () => apiService.getAgentConnectionPolicies(agentConnectionId),
  });

export function useAgentConnectionPoliciesQuery(agentConnectionId: string) {
  return useQuery(agentConnectionPoliciesOptions(agentConnectionId));
}

// Skill bindings of one agent, each carrying whether it is satisfied — i.e.
// whether the agent gets it at all.
export const agentSkillsOptions = (agentId: string) =>
  queryOptions({
    queryKey: agentKeys.skills(agentId),
    queryFn: () => apiService.getAgentSkills({ agentId, size: SKILLS_PAGE_SIZE }),
  });

export function useAgentSkillsQuery(agentId: string) {
  return useQuery(agentSkillsOptions(agentId));
}

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
    // Skills and connections satisfy each other: opening a connection can turn a
    // red skill green, and binding a skill changes a connection's usage count —
    // so the two lists are always refreshed together.
    invalidateAgentAccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.skills(id) });
      queryClient.invalidateQueries({ queryKey: agentKeys.connections(id) });
    },
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: agentKeys.all }),
  };
}
