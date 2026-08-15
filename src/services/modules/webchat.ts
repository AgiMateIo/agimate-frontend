// modules/webchat.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  CentrifugoTokenResponse,
  PagedResponse,
  WebchatFileUploadResponse,
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

  // Upload one composer attachment; reference it via parts:[{fileId}] when
  // sending. 413/400 = over the size limit, 429 = rate limited (back off).
  async uploadWebchatFile(file: File): Promise<WebchatFileUploadResponse> {
    const form = new FormData();
    form.append('file', file);
    return httpClient.postForm<WebchatFileUploadResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/files`,
      form,
    );
  },

  // `text` is optional when `parts` are present (max 5); a message with
  // neither is a 400.
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

  // Soft close: history stays readable, sending returns 400.
  async closeWebchatSession(sessionId: string): Promise<WebchatSessionResponse> {
    return httpClient.delete<WebchatSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${sessionId}`,
    );
  },
};
