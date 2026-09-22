import { useCallback, useMemo } from 'react';
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { useSessionEventsSubscription } from '@/realtime/useSessionEventsSubscription';
import { dedupeById, nextPageParam } from '@/utils/paging';
import type { ChatSessionResponse, PagedResponse, SessionEvent } from '@/types';
import { channelKeys } from './channels';
import { webchatKeys } from './webchat';

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

type SessionPage = PagedResponse<ChatSessionResponse>;

// Where a live row lands in one freshest-first list. Present: replaced whole,
// in place — unless its activity moved, and then it goes to the top. Absent: a
// new session goes to the top, and so does a known one fresher than the head
// (it was on a page not loaded yet, and the list would otherwise miss it until
// the next read); anything older is left for whoever scrolls to its page.
// `undefined` = this list is not touched.
function placeRow(
  rows: ChatSessionResponse[],
  row: ChatSessionResponse,
  isNew: boolean,
): ChatSessionResponse[] | undefined {
  const at = rows.findIndex((s) => s.id === row.id);
  if (at >= 0) {
    if (rows[at].lastActivityAt === row.lastActivityAt) {
      const next = [...rows];
      next[at] = row;
      return next;
    }
    return [row, ...rows.filter((s) => s.id !== row.id)];
  }
  const head = rows[0];
  if (isNew || !head || row.lastActivityAt > head.lastActivityAt) return [row, ...rows];
  return undefined;
}

// The same over a grown-on-demand list: a row found on page 3 either stays
// there (nothing moved) or is lifted onto page 0 — never left in both.
function placeInPages(
  data: InfiniteData<SessionPage>,
  row: ChatSessionResponse,
  isNew: boolean,
): InfiniteData<SessionPage> {
  const [first, ...rest] = data.pages;
  if (!first) return data;
  const found = data.pages.findIndex((p) => p.content.some((s) => s.id === row.id));
  if (found < 0) {
    const content = placeRow(first.content, row, isNew);
    if (!content) return data;
    const totalElements = first.totalElements + (isNew ? 1 : 0);
    return { ...data, pages: [{ ...first, content, totalElements }, ...rest] };
  }
  const moved =
    data.pages[found].content.find((s) => s.id === row.id)!.lastActivityAt !== row.lastActivityAt;
  const pages = data.pages.map((p, i) =>
    i !== found
      ? p
      : {
          ...p,
          content: moved
            ? p.content.filter((s) => s.id !== row.id)
            : p.content.map((s) => (s.id === row.id ? row : s)),
        },
  );
  if (moved) pages[0] = { ...pages[0], content: [row, ...pages[0].content] };
  return { ...data, pages };
}

/**
 * Keeps every cached session list in step with the personal channel's
 * `session.created` / `session.updated`: the webchat lists (chat pane, recent
 * chats, the dashboard counter), a channel's conversations and a
 * conversation's errands. Each event is the listing's row in full, so it
 * replaces the cached one — a repeat is the same row again, and nothing is
 * ever counted up locally. A list is touched only if the row belongs to it by
 * that list's own filter, which is what keeps a Telegram thread out of the
 * chat pane and an errand out of everything but its parent's panel.
 *
 * Mounted by each screen that shows such a list; two mounted at once apply the
 * same replacement twice, which changes nothing.
 */
export function useLiveSessionRows() {
  const queryClient = useQueryClient();

  const apply = useCallback(
    ({ type, session: row }: SessionEvent) => {
      const isNew = type === 'session.created';

      const pages = (queryKey: QueryKey) =>
        queryClient.setQueryData<InfiniteData<SessionPage>>(
          queryKey,
          (old) => old && placeInPages(old, row, isNew),
        );
      const page = (queryKey: QueryKey) =>
        queryClient.setQueryData<SessionPage>(queryKey, (old) => {
          const content = old && placeRow(old.content, row, isNew);
          if (!old || !content) return old;
          const grew = isNew && !old.content.some((s) => s.id === row.id);
          return { ...old, content, totalElements: old.totalElements + (grew ? 1 : 0) };
        });

      if (row.connectorCode === 'webchat' && row.parentSessionId === null) {
        for (const agentId of [undefined, row.agentId]) {
          pages(webchatKeys.sessionsPages(agentId));
          page(webchatKeys.sessionsList(agentId));
        }
      }
      if (row.channelId) pages(channelKeys.sessions(row.channelId));
      if (row.parentSessionId) {
        queryClient.setQueryData<SessionPage>(chatSessionKeys.errands(row.parentSessionId), (old) => {
          const content = old && placeRow(old.content, row, isNew);
          return old && content ? { ...old, content } : old;
        });
      }
    },
    [queryClient],
  );

  useSessionEventsSubscription(apply);
}
