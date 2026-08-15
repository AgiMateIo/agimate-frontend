import { useCallback, useMemo } from 'react';
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { dedupeById, nextPageParam } from '@/utils/paging';
import type { WebchatActivityPayload, PagedResponse, WebchatSessionResponse } from '@/types';

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

// Applies `update` to every cached session row, in both shapes the sessions
// list is cached in (paged-through pages and the single newest page).
function patchSessionRows(
  queryClient: QueryClient,
  update: (session: WebchatSessionResponse) => WebchatSessionResponse,
) {
  queryClient.setQueriesData<SessionPages>(
    { queryKey: webchatKeys.sessionsPagesAll() },
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((p) => ({ ...p, content: p.content.map(update) })),
      },
  );
  queryClient.setQueriesData<PagedResponse<WebchatSessionResponse>>(
    { queryKey: webchatKeys.sessionsLists() },
    (old) => old && { ...old, content: old.content.map(update) },
  );
}

/**
 * Moves a session's read pointer and drops its badge.
 *
 * Fire-and-forget by design: the badge goes to zero locally first, and a failed
 * request is swallowed rather than shown — the next listing carries the true
 * count either way, and nothing the user did is at stake. Repeat calls are
 * harmless server-side (the pointer only moves forward).
 */
export function useMarkWebchatSessionRead() {
  const queryClient = useQueryClient();

  return useCallback(
    async (sessionId: string, lastReadMessageId?: string) => {
      const clear = () =>
        patchSessionRows(queryClient, (s) =>
          s.sessionId === sessionId && s.unreadCount > 0 ? { ...s, unreadCount: 0 } : s,
        );
      clear();
      try {
        await apiService.markWebchatSessionRead(sessionId, lastReadMessageId);
        // Again after the round trip: the same message that triggered this also
        // refetches the sessions list, and a response the server prepared before
        // the pointer moved brings the count back.
        clear();
      } catch {
        // Swallowed on purpose — see above.
      }
    },
    [queryClient],
  );
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
    // A delivered agent message in some session of the user's — the personal
    // channel's counting event. Raises that row's badge and preview at once,
    // then refetches: the event carries no attachment flag, the count it
    // implies can drift (it is best-effort), and the row's place in the list
    // moved server-side.
    applyActivity: (p: WebchatActivityPayload) => {
      patchSessionRows(queryClient, (s) =>
        s.sessionId === p.sessionId
          ? {
              ...s,
              unreadCount: s.unreadCount + 1,
              // Whatever the run was doing, this message ended the turn.
              isRunning: false,
              lastMessageAt: p.createdAt,
              lastMessage: {
                text: p.preview,
                direction: 'AGENT',
                hasAttachments: false,
                createdAt: p.createdAt,
              },
            }
          : s,
      );
      // Only the lists that can hold this row — a message from one agent must
      // not send another agent's open chat list back to the server.
      for (const key of [
        webchatKeys.sessionsPages(p.agentId),
        webchatKeys.sessionsPages(undefined),
        webchatKeys.sessionsLists(),
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    // Called on chat activity (title and lastMessageAt move server-side). It
    // costs one request per page the user has loaded, so paging deep into the
    // sessions while an agent is answering is the expensive combination — rare
    // enough to leave alone, and page 0 is where the change lands anyway.
    invalidateSessions: () =>
      queryClient.invalidateQueries({ queryKey: webchatKeys.sessions() }),
  };
}
