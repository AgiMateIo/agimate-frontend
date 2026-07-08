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

  // Sorted by lastMessageAt desc on the backend.
  async getWebchatSessions(params?: { agentId?: string }): Promise<WebchatSessionResponse[]> {
    const q = new URLSearchParams();
    if (params?.agentId) q.set('agentId', params.agentId);
    const qs = q.toString();
    return httpClient.get<WebchatSessionResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${qs ? `?${qs}` : ''}`,
    );
  },

  // Per-session Centrifugo tokens, TTL ~1h — getToken callbacks re-fetch.
  async getWebchatSessionToken(sessionId: string): Promise<CentrifugoTokenResponse> {
    return httpClient.post<CentrifugoTokenResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${sessionId}/token`,
      {},
    );
  },

  async sendWebchatMessage(sessionId: string, text: string): Promise<WebchatSendMessageResponse> {
    return httpClient.post<WebchatSendMessageResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions/${sessionId}/messages`,
      { text },
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
