import { useMemo } from 'react';
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { agenticTeamKeys } from './agentic-teams';
import { dedupeById, nextPageParam } from '@/utils/paging';
import type { AgentRequestFilters, AgentRequestRow, PagedResponse } from '@/types';

// The correspondence of one team: what its agents have handed to each other.
// Under the team's own key so that dropping a team drops its threads with it.
// Lists and threads are separate branches of the key on purpose: a patch that
// walks every cached list must not be handed a thread to rewrite as pages.
export const agentRequestKeys = {
  all: (teamId: string) => [...agenticTeamKeys.detail(teamId), 'requests'] as const,
  lists: (teamId: string) => [...agentRequestKeys.all(teamId), 'list'] as const,
  list: (teamId: string, filters: AgentRequestFilters) =>
    [...agentRequestKeys.lists(teamId), filters] as const,
  thread: (teamId: string, threadId: string) =>
    [...agentRequestKeys.all(teamId), 'thread', threadId] as const,
};

type RequestPages = InfiniteData<PagedResponse<AgentRequestRow>>;

const PAGE_SIZE = 50;

// Rows move under the paging exactly as sessions do — a branch that just
// reported jumps back to the top of page 0 — so pages grow on demand and the
// flattened list is deduped by id rather than trusted.
export const agentRequestsOptions = (teamId: string, filters: AgentRequestFilters) =>
  infiniteQueryOptions({
    queryKey: agentRequestKeys.list(teamId, filters),
    queryFn: ({ pageParam }) =>
      apiService.getAgentRequests(teamId, { ...filters, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: nextPageParam,
  });

export function useAgentRequestsQuery(teamId: string, filters: AgentRequestFilters) {
  const query = useInfiniteQuery(agentRequestsOptions(teamId, filters));
  const requests = useMemo(
    () => dedupeById(query.data?.pages.flatMap((p) => p.content) ?? [], (r) => r.id),
    [query.data],
  );
  return { ...query, requests };
}

export const agentRequestThreadOptions = (teamId: string, threadId: string) =>
  queryOptions({
    queryKey: agentRequestKeys.thread(teamId, threadId),
    queryFn: () => apiService.getAgentRequest(teamId, threadId),
  });

export function useAgentRequestThreadQuery(teamId: string, threadId: string | null) {
  return useQuery({
    ...agentRequestThreadOptions(teamId, threadId ?? ''),
    enabled: !!threadId,
  });
}

export function useAgentRequestCacheActions(teamId: string) {
  const queryClient = useQueryClient();

  return {
    // A live event carries the whole row, so a branch already on screen is
    // updated without a request. It goes across every cached filter: the same
    // row can sit in the unfiltered list and in one narrowed to its addressee.
    //
    // The list is by last activity, and an event is activity — so the patched
    // row is lifted to the front of the pages it is in rather than left where
    // the server last put it, which is what the next refetch will do anyway.
    patchRequest: (row: AgentRequestRow) => {
      queryClient.setQueriesData<RequestPages>(
        { queryKey: agentRequestKeys.lists(teamId) },
        (old) => {
          if (!old) return old;
          const present = old.pages.some((p) => p.content.some((r) => r.id === row.id));
          if (!present) return old;
          const pages = old.pages.map((p) => ({
            ...p,
            content: p.content.filter((r) => r.id !== row.id),
          }));
          return {
            ...old,
            pages: [{ ...pages[0], content: [row, ...pages[0].content] }, ...pages.slice(1)],
          };
        },
      );
    },
    // A branch nobody has loaded yet (a request that has just started) cannot
    // be patched into place — its page is the server's to state.
    invalidateLists: () =>
      queryClient.invalidateQueries({ queryKey: agentRequestKeys.lists(teamId) }),
    // The row says what happened; the correspondence itself has to be re-read.
    invalidateThread: (threadId: string) =>
      queryClient.invalidateQueries({ queryKey: agentRequestKeys.thread(teamId, threadId) }),
  };
}
