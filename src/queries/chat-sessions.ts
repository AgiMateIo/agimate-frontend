import { useMemo } from 'react';
import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { dedupeById, nextPageParam } from '@/utils/paging';

// The `/manage/sessions` resource where it is not webchat's: the history of any
// conversation, whatever carries it. Webchat's own lists and their caches live
// in `./webchat`.
export const chatSessionKeys = {
  all: ['chat-sessions'] as const,
  messages: (sessionId: string) => [...chatSessionKeys.all, 'messages', sessionId] as const,
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
