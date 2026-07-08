import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { WebchatSessionResponse } from '@/types';

export const webchatKeys = {
  all: ['webchat'] as const,
  sessions: () => [...webchatKeys.all, 'sessions'] as const,
  sessionsList: (agentId?: string) =>
    [...webchatKeys.sessions(), agentId ?? 'all'] as const,
};

export const webchatSessionsOptions = (agentId?: string) =>
  queryOptions({
    queryKey: webchatKeys.sessionsList(agentId),
    queryFn: () => apiService.getWebchatSessions(agentId ? { agentId } : undefined),
  });

// Non-suspense: the chat page renders its own loading/empty states.
export function useWebchatSessionsQuery(agentId?: string) {
  return useQuery(webchatSessionsOptions(agentId));
}

export function useWebchatCacheActions() {
  const queryClient = useQueryClient();
  return {
    // Prepend a freshly created session into the lists it belongs to.
    addSession: (session: WebchatSessionResponse) => {
      for (const key of [
        webchatKeys.sessionsList(undefined),
        webchatKeys.sessionsList(session.agentId),
      ]) {
        queryClient.setQueryData<WebchatSessionResponse[]>(key, (old) =>
          old ? [session, ...old.filter((s) => s.sessionId !== session.sessionId)] : old
        );
      }
    },
    // Replace a session in-place across every cached list (e.g. after close).
    patchSession: (session: WebchatSessionResponse) => {
      queryClient.setQueriesData<WebchatSessionResponse[]>(
        { queryKey: webchatKeys.sessions() },
        (old) =>
          old?.map((s) => (s.sessionId === session.sessionId ? session : s))
      );
    },
    invalidateSessions: () =>
      queryClient.invalidateQueries({ queryKey: webchatKeys.sessions() }),
  };
}
