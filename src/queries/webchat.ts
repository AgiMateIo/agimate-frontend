import { useCallback, useMemo } from 'react';
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { dedupeById, nextPageParam } from '@/utils/paging';
import { placeRow } from '@/utils/liveRows';
import { useIsGuest } from '@/hooks/useIsGuest';
import { usePersonalEvent } from '@/realtime/usePersonalEvent';
import type { AgentResponse, PagedResponse, ChatSessionResponse, WebchatContactResponse } from '@/types';
import { agentKeys } from './agents';

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
  contacts: () => [...webchatKeys.all, 'contacts'] as const,
};

const SESSIONS_PAGE_SIZE = 50;

// The chat pane lists conversations that go through the dashboard's own chat and
// nothing else. `/manage/sessions` without this filter is *every* conversation
// the user has — messenger threads and a connection's channel-less event stream
// included — and those carry no unread count, preview or running flag, so a row
// of another connector would render as a chat that is permanently silent.
const WEBCHAT = 'webchat';

type SessionPages = InfiniteData<PagedResponse<ChatSessionResponse>>;

// The newest page, for callers that want a count or the last few conversations
// rather than the list itself — `totalElements` is the whole set either way.
export const webchatSessionsOptions = (agentId?: string) =>
  queryOptions({
    queryKey: webchatKeys.sessionsList(agentId),
    queryFn: () =>
      apiService.getChatSessions({
        agentId,
        connectorCode: WEBCHAT,
        page: 0,
        size: SESSIONS_PAGE_SIZE,
      }),
  });

export const webchatSessionsPagesOptions = (agentId?: string) =>
  infiniteQueryOptions({
    queryKey: webchatKeys.sessionsPages(agentId),
    queryFn: ({ pageParam }) =>
      apiService.getChatSessions({
        agentId,
        connectorCode: WEBCHAT,
        page: pageParam,
        size: SESSIONS_PAGE_SIZE,
      }),
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
    () => dedupeById(query.data?.pages.flatMap((p) => p.content) ?? [], (s) => s.id),
    [query.data],
  );
  return { ...query, sessions };
}

// Applies `update` to every cached session row, in both shapes the sessions
// list is cached in (paged-through pages and the single newest page).
function patchSessionRows(
  queryClient: QueryClient,
  update: (session: ChatSessionResponse) => ChatSessionResponse,
) {
  queryClient.setQueriesData<SessionPages>(
    { queryKey: webchatKeys.sessionsPagesAll() },
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((p) => ({ ...p, content: p.content.map(update) })),
      },
  );
  queryClient.setQueriesData<PagedResponse<ChatSessionResponse>>(
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
          s.id === sessionId && s.unreadCount > 0 ? { ...s, unreadCount: 0 } : s,
        );
      clear();
      try {
        await apiService.markChatSessionRead(sessionId, lastReadMessageId);
        // Again after the round trip: a `session.updated` carrying the message
        // that triggered this can land after the first clear, with the count
        // from before the pointer moved.
        clear();
      } catch {
        // Swallowed on purpose — see above.
      }
    },
    [queryClient],
  );
}

// One page: agents with unread messages are the freshest ones.
const CONTACTS_PAGE_SIZE = 100;

type ContactsPage = PagedResponse<WebchatContactResponse>;

const CONTACT_EVENTS = ['webchat.agent.updated'] as const;

export const webchatContactsOptions = () =>
  queryOptions({
    queryKey: webchatKeys.contacts(),
    queryFn: () => apiService.getWebchatContacts({ page: 0, size: CONTACTS_PAGE_SIZE }),
  });

// All badges share one cached page through `select`.
function useContactsSelect<T>(select: (page: ContactsPage) => T) {
  const isGuest = useIsGuest();
  return useQuery({ ...webchatContactsOptions(), select, enabled: !isGuest }).data;
}

export function useAgentUnread(agentId: string): number {
  const select = useCallback(
    (page: ContactsPage) => page.content.find((c) => c.agentId === agentId)?.unreadCount ?? 0,
    [agentId],
  );
  return useContactsSelect(select) ?? 0;
}

const sumUnread = (page: ContactsPage) => page.content.reduce((sum, c) => sum + c.unreadCount, 0);

export function useTotalUnread(): number {
  return useContactsSelect(sumUnread) ?? 0;
}

const unreadByAgent = (page: ContactsPage) =>
  new Map(page.content.map((c) => [c.agentId, c.unreadCount]));

export function useUnreadByAgent(): Map<string, number> | undefined {
  return useContactsSelect(unreadByAgent);
}


// An agent's name from the cache, without a request.
export function cachedAgentName(queryClient: QueryClient, agentId: string): string | null {
  return (
    queryClient.getQueryData<ContactsPage>(webchatKeys.contacts())?.content.find((c) => c.agentId === agentId)
      ?.name ??
    queryClient.getQueryData<AgentResponse>(agentKeys.detail(agentId))?.name ??
    null
  );
}

// Applies `webchat.agent.updated` to the cached contacts page.
export function useLiveContacts(enabled: boolean) {
  const queryClient = useQueryClient();
  usePersonalEvent(enabled, CONTACT_EVENTS, (_type, payload) => {
    const row = payload as WebchatContactResponse | undefined;
    if (!row?.agentId) return;
    queryClient.setQueryData<ContactsPage>(
      webchatKeys.contacts(),
      (old) => old && { ...old, content: placeRow(old.content, row, (c) => c.agentId, true)! },
    );
  });
}
