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
import { dedupeById, nextPageParam } from '@/utils/paging';
import type { ChannelResponse, ChatSessionResponse, PagedResponse } from '@/types';

export const channelKeys = {
  all: ['channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  list: (agentId?: string) => [...channelKeys.lists(), agentId ?? 'all'] as const,
  sessions: (channelId: string) => [...channelKeys.all, 'sessions', channelId] as const,
};

// Without an agentId this is every channel the user owns (the Channels page);
// with one it is that agent's own channels tab, which is a different list from
// the backend and so a key of its own.
export const channelsListOptions = (agentId?: string) =>
  queryOptions({
    queryKey: channelKeys.list(agentId),
    queryFn: () => apiService.getChannels(agentId ? { agentId } : undefined),
  });

export function useAgentChannelsQuery(agentId: string) {
  return useQuery(channelsListOptions(agentId));
}

// A busy channel accumulates sessions without limit, so the pane loads one page
// and grows on demand rather than pretending the first page is the whole list.
//
// Conversations of every channel live in one resource (`/manage/sessions`), so a
// channel's own list is that resource filtered by `channelId` — the rows are the
// same shape a webchat row has, minus the two webchat-only fields
// (`unreadCount`, `lastMessage`), which arrive empty here.
//
// The `Subagents: <agent>` channel is a channel like any other, so this is also
// where an agent's errands to copies of itself are read: those rows carry a
// `parentSessionId` and a live `isRunning`, and their first message is a
// `<subagent_request>` block, which the transcript knows how to render.
const SESSIONS_PAGE_SIZE = 50;

export const channelSessionsOptions = (channelId: string) =>
  infiniteQueryOptions({
    queryKey: channelKeys.sessions(channelId),
    queryFn: ({ pageParam }) =>
      apiService.getChatSessions({ channelId, page: pageParam, size: SESSIONS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: nextPageParam,
  });

export function useChannelSessionsQuery(channelId: string) {
  const query = useInfiniteQuery(channelSessionsOptions(channelId));
  const sessions = useMemo(
    () => dedupeById(query.data?.pages.flatMap((p) => p.content) ?? [], (s) => s.id),
    [query.data],
  );
  return { ...query, sessions };
}

export function useChannelCacheActions() {
  const queryClient = useQueryClient();
  return {
    // Save/delete in the agent tab patches that agent's list for instant
    // feedback, then invalidates every list so the all-channels page (a
    // separate key) converges too.
    upsertChannel: (agentId: string, saved: ChannelResponse) => {
      queryClient.setQueryData<ChannelResponse[]>(channelKeys.list(agentId), (old) => {
        if (!old) return old;
        const idx = old.findIndex((c) => c.id === saved.id);
        if (idx < 0) return [saved, ...old];
        const next = [...old];
        next[idx] = saved;
        return next;
      });
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
    },
    removeChannel: (agentId: string, id: string) => {
      queryClient.setQueryData<ChannelResponse[]>(channelKeys.list(agentId), (old) =>
        old?.filter((c) => c.id !== id),
      );
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
    },
    // Replace a session in place across the loaded pages (e.g. after closing it),
    // instead of refetching pages the user has already scrolled past.
    patchSession: (channelId: string, session: ChatSessionResponse) => {
      queryClient.setQueryData<InfiniteData<PagedResponse<ChatSessionResponse>>>(
        channelKeys.sessions(channelId),
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              content: page.content.map((s) => (s.id === session.id ? session : s)),
            })),
          },
      );
    },
  };
}
