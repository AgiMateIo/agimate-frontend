import { useCallback, useMemo } from 'react';
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { dedupeById, nextPageParam } from '@/utils/paging';

// The `/manage/sessions` resource where it is not webchat's: the history of any
// conversation whatever carries it, and the errands running for one of them.
// Webchat's own lists and their caches live in `./webchat`.
export const chatSessionKeys = {
  all: ['chat-sessions'] as const,
  messages: (sessionId: string) => [...chatSessionKeys.all, 'messages', sessionId] as const,
  errands: (parentSessionId: string) =>
    [...chatSessionKeys.all, 'errands', parentSessionId] as const,
};

const MESSAGES_PAGE_SIZE = 50;

export const sessionMessagesOptions = (sessionId: string) =>
  infiniteQueryOptions({
    queryKey: chatSessionKeys.messages(sessionId),
    queryFn: ({ pageParam }) =>
      apiService.getChatSessionMessages(sessionId, { page: pageParam, size: MESSAGES_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: nextPageParam,
  });

// History comes newest-first (page 0 = the latest messages), so the flattened
// pages are reversed once here and every consumer reads a transcript. Deduped by
// `id` and not by `messageId`: that one is null outside webchat.
export function useSessionMessagesQuery(sessionId: string) {
  const query = useInfiniteQuery(sessionMessagesOptions(sessionId));
  const messages = useMemo(
    () => dedupeById(query.data?.pages.flatMap((p) => p.content) ?? [], (m) => m.id).reverse(),
    [query.data],
  );
  return { ...query, messages };
}

// Every errand a conversation has handed out, freshest first — the agent's own
// copies (`connectorCode: 'subagents'`) and the branches of other agents of the
// team (`connectorCode: 'agents'`, and an `agentId` that is somebody else's)
// alike: `parentSessionId` is what they have in common and the only way to list
// them. One page and no paging: a conversation delegates to a handful of
// workers, not to a list somebody scrolls.
const ERRANDS_PAGE_SIZE = 50;

// How often the list is re-read while one of them is working. They report in
// the background with nothing to announce them — the parent chat's own events
// only fire once the agent answers, which is after the last of them is done.
const RUNNING_POLL_MS = 5_000;

export const errandSessionsOptions = (parentSessionId: string) =>
  queryOptions({
    queryKey: chatSessionKeys.errands(parentSessionId),
    queryFn: () =>
      apiService.getChatSessions({
        parentSessionId,
        page: 0,
        size: ERRANDS_PAGE_SIZE,
      }),
    select: (page) => page.content,
    // A worker that died quietly keeps `isRunning` for up to 15 minutes, so
    // this can poll a conversation nobody is waiting on any more. It costs one
    // request per five seconds on an open chat only — the panel unmounts with
    // the conversation.
    refetchInterval: (query) =>
      query.state.data?.content.some((s) => s.isRunning) ? RUNNING_POLL_MS : false,
  });

export function useErrandSessionsQuery(parentSessionId: string) {
  return useQuery(errandSessionsOptions(parentSessionId));
}

// Re-reads the errands of one conversation. The chat calls it on every
// non-progress event: a worker that has just reported turns the agent's
// answer into an event here, and that is the moment the list stops being
// "three working" — the poll above would otherwise carry the stale row for up
// to five seconds under an answer that is already on screen.
export function useInvalidateErrandSessions() {
  const queryClient = useQueryClient();
  return useCallback(
    (parentSessionId: string) =>
      queryClient.invalidateQueries({ queryKey: chatSessionKeys.errands(parentSessionId) }),
    [queryClient],
  );
}
