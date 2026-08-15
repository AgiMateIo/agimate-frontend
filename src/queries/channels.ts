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
import type { ChannelSessionResponse, PagedResponse } from '@/types';

export const channelKeys = {
  all: ['channels'] as const,
  list: () => [...channelKeys.all, 'list'] as const,
  sessions: (channelId: string) => [...channelKeys.all, 'sessions', channelId] as const,
  sessionMessages: (sessionId: string) =>
    [...channelKeys.all, 'session-messages', sessionId] as const,
};

export const channelsListOptions = () =>
  queryOptions({
    queryKey: channelKeys.list(),
    queryFn: () => apiService.getChannels(),
  });

// A busy channel accumulates sessions without limit, so the pane loads one page
// and grows on demand rather than pretending the first page is the whole list.
const SESSIONS_PAGE_SIZE = 50;
const MESSAGES_PAGE_SIZE = 50;

export const channelSessionsOptions = (channelId: string) =>
  infiniteQueryOptions({
    queryKey: channelKeys.sessions(channelId),
    queryFn: ({ pageParam }) =>
      apiService.getChannelSessions(channelId, { page: pageParam, size: SESSIONS_PAGE_SIZE }),
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

export const channelSessionMessagesOptions = (sessionId: string) =>
  infiniteQueryOptions({
    queryKey: channelKeys.sessionMessages(sessionId),
    queryFn: ({ pageParam }) =>
      apiService.getChannelSessionMessages(sessionId, {
        page: pageParam,
        size: MESSAGES_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: nextPageParam,
  });

// History comes newest-first (page 0 = the latest messages), so the flattened
// pages are reversed once here and every consumer reads a transcript.
export function useChannelSessionMessagesQuery(sessionId: string) {
  const query = useInfiniteQuery(channelSessionMessagesOptions(sessionId));
  const messages = useMemo(
    () => dedupeById(query.data?.pages.flatMap((p) => p.content) ?? [], (m) => m.id).reverse(),
    [query.data],
  );
  return { ...query, messages };
}

export function useChannelCacheActions() {
  const queryClient = useQueryClient();
  return {
    // Replace a session in place across the loaded pages (e.g. after closing it),
    // instead of refetching pages the user has already scrolled past.
    patchSession: (channelId: string, session: ChannelSessionResponse) => {
      queryClient.setQueryData<InfiniteData<PagedResponse<ChannelSessionResponse>>>(
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
