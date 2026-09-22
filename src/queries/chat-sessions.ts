import { useCallback, useMemo } from 'react';
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
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

// How often the list is re-read while one of them is working. The rows are
// live (`session.updated` flips `isRunning`), so this is only the backstop for
// a lost event and for a worker that died quietly — its row keeps saying
// "running" for up to 15 minutes and no event announces the end of that.
const RUNNING_POLL_MS = 30_000;

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
    // Costs one request per thirty seconds on an open chat only — the panel
    // unmounts with the conversation.
    refetchInterval: (query) =>
      query.state.data?.content.some((s) => s.isRunning) ? RUNNING_POLL_MS : false,
  });

export function useErrandSessionsQuery(parentSessionId: string) {
  return useQuery(errandSessionsOptions(parentSessionId));
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
 * Puts one session row into every cached list it belongs to — by that list's
 * own filter, which is what keeps a Telegram thread out of the chat pane and an
 * errand out of everything but its parent's panel. The one way a session row
 * enters the cache: a live `session.*` event and a REST answer (a chat just
 * started, a rename, a close) both come through here, since both are the
 * listing's row in full. Replacing is idempotent, so the event that follows a
 * local write changes nothing.
 */
export function applySessionRow(
  queryClient: QueryClient,
  row: ChatSessionResponse,
  isNew = false,
) {
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
  if (row.parentSessionId) page(chatSessionKeys.errands(row.parentSessionId));
}

export function useApplySessionRow() {
  const queryClient = useQueryClient();
  return useCallback(
    (row: ChatSessionResponse, isNew = false) => applySessionRow(queryClient, row, isNew),
    [queryClient],
  );
}

/**
 * Keeps every cached session list in step with the personal channel's
 * `session.created` / `session.updated`. Mounted once, with the dashboard
 * shell — a screen showing sessions needs nothing of its own. Each event is
 * the listing's row in full: nothing is ever counted up locally, the badge is
 * the server's `unreadCount`.
 */
export function useLiveSessionRows(enabled: boolean) {
  const apply = useApplySessionRow();
  useSessionEventsSubscription(
    enabled,
    useCallback(
      ({ type, session }: SessionEvent) => apply(session, type === 'session.created'),
      [apply],
    ),
  );
}
