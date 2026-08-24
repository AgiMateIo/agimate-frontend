// modules/webchat.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  CentrifugoTokenResponse,
  PagedResponse,
  WebchatMessageResponse,
  WebchatSendMessageResponse,
  WebchatSessionResponse,
} from '@/types';

export const webchatApi = {
  // Every call creates a new session; the first POST for an agent lazily
  // wires webchat to it on the backend.
  async createWebchatSession(agentId: string): Promise<WebchatSessionResponse> {
    return httpClient.post<WebchatSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions`,
      { agentId },
    );
  },

  // Sorted by lastMessageAt desc on the backend, paged (`size` capped at 100).
  // The set moves under the paging — an active session jumps back to the top —
  // so concatenated pages have to be deduped by sessionId.
  async getWebchatSessions(params?: {
    agentId?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<WebchatSessionResponse>> {
    const query = buildPagedQuery({ agentId: params?.agentId }, params);
    return httpClient.get<PagedResponse<WebchatSessionResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/?${query}`,
    );
  },

  // Per-session Centrifugo tokens, TTL ~1h — getToken callbacks re-fetch.
  async getWebchatSessionToken(sessionId: string): Promise<CentrifugoTokenResponse> {
    return httpClient.post<CentrifugoTokenResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${sessionId}/token`,
      {},
    );
  },

  // `text` is optional when `parts` are present (max 5); a message with
  // neither is a 400. A part references a file uploaded through
  // `apiService.uploadUserFile` — and the key inside `parts` is `fileId`, not
  // the row's own `id` field name. The backend checks ownership, readiness and
  // expiry of each one: a file that fails any of them is a 400, never a
  // silently dropped attachment.
  async sendWebchatMessage(
    sessionId: string,
    body: { text?: string; parts?: { fileId: string }[] },
  ): Promise<WebchatSendMessageResponse> {
    return httpClient.post<WebchatSendMessageResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${sessionId}/messages`,
      body,
    );
  },

  // Newest-first: page 0 holds the latest messages.
  async getWebchatMessages(
    sessionId: string,
    params?: { page?: number; size?: number },
  ): Promise<PagedResponse<WebchatMessageResponse>> {
    const query = buildPagedQuery({}, params);
    return httpClient.get<PagedResponse<WebchatMessageResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${sessionId}/messages/?${query}`,
    );
  },

  // Moves the session's read pointer, clearing its unread badge. Without an id
  // the session is marked read to its end — which is what opening it means.
  //
  // `lastReadMessageId` is a history row's `id`, NOT its `messageId` (that one
  // is the delivery key for real-time dedup and carries no order) — sending the
  // wrong one is a 400. The pointer only ever moves forward, so a stale call
  // from a second device is a no-op rather than an unread badge coming back.
  async markWebchatSessionRead(sessionId: string, lastReadMessageId?: string): Promise<void> {
    await httpClient.post<null>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${sessionId}/read`,
      lastReadMessageId ? { lastReadMessageId } : {},
    );
  },

  // Soft close: history stays readable, sending returns 400.
  async closeWebchatSession(sessionId: string): Promise<WebchatSessionResponse> {
    return httpClient.delete<WebchatSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${sessionId}`,
    );
  },
};
