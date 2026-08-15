import { useMemo } from 'react';
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { dedupeById, nextPageParam } from '@/utils/paging';
import type { PagedResponse, WebchatSessionResponse } from '@/types';

export const webchatKeys = {
  all: ['webchat'] as const,
  sessions: () => [...webchatKeys.all, 'sessions'] as const,
  // Newest page only — the dashboard counter and the recent-chats card.
  sessionsLists: () => [...webchatKeys.sessions(), 'list'] as const,
  sessionsList: (agentId?: string) => [...webchatKeys.sessionsLists(), agentId ?? 'all'] as const,
  // Paged through from the chat pane, one page at a time.
  sessionsPagesAll: () => [...webchatKeys.sessions(), 'pages'] as const,
  sessionsPages: (agentId?: string) =>
    [...webchatKeys.sessionsPagesAll(), agentId ?? 'all'] as const,
};

const SESSIONS_PAGE_SIZE = 50;

type SessionPages = InfiniteData<PagedResponse<WebchatSessionResponse>>;

// The newest page, for callers that want a count or the last few conversations
// rather than the list itself — `totalElements` is the whole set either way.
export const webchatSessionsOptions = (agentId?: string) =>
  queryOptions({
    queryKey: webchatKeys.sessionsList(agentId),
    queryFn: () => apiService.getWebchatSessions({ agentId, page: 0, size: SESSIONS_PAGE_SIZE }),
  });

export const webchatSessionsPagesOptions = (agentId?: string) =>
  infiniteQueryOptions({
    queryKey: webchatKeys.sessionsPages(agentId),
    queryFn: ({ pageParam }) =>
      apiService.getWebchatSessions({ agentId, page: pageParam, size: SESSIONS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: nextPageParam,
  });

// Non-suspense: the chat page renders its own loading/empty states.
export function useWebchatSessionsQuery(agentId?: string) {
  const query = useInfiniteQuery(webchatSessionsPagesOptions(agentId));
  // Sessions shift between page requests (a new one pushes the rest down), so
  // the same row can arrive twice — keep the copy in the position the user has
  // already been looking at.
  const sessions = useMemo(
    () => dedupeById(query.data?.pages.flatMap((p) => p.content) ?? [], (s) => s.sessionId),
    [query.data],
  );
  return { ...query, sessions };
}

export function useWebchatCacheActions() {
  const queryClient = useQueryClient();

  return {
    // Prepend a freshly created session into the lists it belongs to.
    addSession: (session: WebchatSessionResponse) => {
      for (const key of [
        webchatKeys.sessionsPages(undefined),
        webchatKeys.sessionsPages(session.agentId),
      ]) {
        queryClient.setQueryData<SessionPages>(key, (old) => {
          if (!old) return old;
          const pages = old.pages.map((p) => ({
            ...p,
            content: p.content.filter((s) => s.sessionId !== session.sessionId),
          }));
          return {
            ...old,
            pages: [{ ...pages[0], content: [session, ...pages[0].content] }, ...pages.slice(1)],
          };
        });
      }
      // The counting caller lives on another page — a refetch there is cheaper
      // than teaching this about `totalElements`.
      queryClient.invalidateQueries({ queryKey: webchatKeys.sessionsLists() });
    },
    // Replace a session in-place across every cached page (e.g. after close).
    patchSession: (session: WebchatSessionResponse) => {
      queryClient.setQueriesData<SessionPages>(
        { queryKey: webchatKeys.sessionsPagesAll() },
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              content: p.content.map((s) => (s.sessionId === session.sessionId ? session : s)),
            })),
          },
      );
      queryClient.invalidateQueries({ queryKey: webchatKeys.sessionsLists() });
    },
    // Called on chat activity (title and lastMessageAt move server-side). It
    // costs one request per page the user has loaded, so paging deep into the
    // sessions while an agent is answering is the expensive combination — rare
    // enough to leave alone, and page 0 is where the change lands anyway.
    invalidateSessions: () =>
      queryClient.invalidateQueries({ queryKey: webchatKeys.sessions() }),
  };
}
