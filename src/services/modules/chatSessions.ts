// modules/chatSessions.ts — conversations with an agent, whatever carries them.
//
// One resource for webchat, messengers and IDEs alike: `/manage/sessions`. What
// stayed behind in `/manage/webchat` is the transport only (start a chat, send,
// live-channel token) — see modules/webchat.ts.
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  ChatSessionMessageResponse,
  ChatSessionResponse,
  PagedResponse,
} from '@/types';

export const chatSessionsApi = {
  // Freshest activity first, paged (`size` capped at 100 server-side). The set
  // moves under the paging — an active session jumps back to the top — so
  // concatenated pages have to be deduped by `id`.
  //
  // **Every filter is optional, and without one this is every conversation the
  // user has**, not just their chats: a connection's channel-less event stream
  // and every messenger thread are in there too. A chat list means
  // `connectorCode: 'webchat'`; one agent's conversations across all channels
  // mean `agentId` alone.
  async getChatSessions(params?: {
    agentId?: string;
    channelId?: string;
    connectorCode?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<ChatSessionResponse>> {
    const query = buildPagedQuery(
      {
        agentId: params?.agentId,
        channelId: params?.channelId,
        connectorCode: params?.connectorCode,
      },
      params,
    );
    return httpClient.get<PagedResponse<ChatSessionResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/sessions/?${query}`,
    );
  },

  // The same row the listing returns — a deep link to a conversation needs
  // nothing else.
  async getChatSession(sessionId: string): Promise<ChatSessionResponse> {
    return httpClient.get<ChatSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/sessions/${sessionId}`,
    );
  },

  // Newest-first: page 0 holds the latest messages, and a page has to be
  // reversed to read as a transcript.
  async getChatSessionMessages(
    sessionId: string,
    params?: { page?: number; size?: number },
  ): Promise<PagedResponse<ChatSessionMessageResponse>> {
    const query = buildPagedQuery({}, params);
    return httpClient.get<PagedResponse<ChatSessionMessageResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/sessions/${sessionId}/messages/?${query}`,
    );
  },

  // Renames for good: the title the system derived from the first message is
  // overwritten and there is no endpoint to bring it back. Over 80 characters
  // is a 400, never a silent trim.
  async renameChatSession(sessionId: string, title: string): Promise<ChatSessionResponse> {
    return httpClient.patch<ChatSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/sessions/${sessionId}`,
      { title },
    );
  },

  // Soft close: history stays readable, sending returns 400. Answers the
  // enriched row, so it can go straight back into the list.
  async closeChatSession(sessionId: string): Promise<ChatSessionResponse> {
    return httpClient.post<ChatSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/sessions/${sessionId}/close`,
      {},
    );
  },

  // Moves the session's read pointer, clearing its unread badge. Without an id
  // the session is marked read to its end — which is what opening it means.
  //
  // `lastReadMessageId` is a history row's `id`, NOT its `messageId` (that one
  // is the delivery key for real-time dedup and carries no order) — sending the
  // wrong one is a 400. The pointer only ever moves forward, so a stale call
  // from a second device is a no-op rather than an unread badge coming back.
  async markChatSessionRead(sessionId: string, lastReadMessageId?: string): Promise<void> {
    await httpClient.post<null>(
      `${API.ENDPOINTS.CONTROL_API}/manage/sessions/${sessionId}/read`,
      lastReadMessageId ? { lastReadMessageId } : {},
    );
  },
};
