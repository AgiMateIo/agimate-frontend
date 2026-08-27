// modules/webchat.ts — the dashboard chat's transport only.
//
// The conversation itself (listing, history, read pointer, close, rename) moved
// to the channel-agnostic `/manage/sessions` — see modules/chatSessions.ts.
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  CentrifugoTokenResponse,
  ChatSessionResponse,
  WebchatSendMessageResponse,
} from '@/types';

export const webchatApi = {
  // Every call creates a new session; the first POST for an agent lazily
  // wires webchat to it on the backend. Answers the same row the sessions
  // listing returns.
  async createWebchatSession(agentId: string): Promise<ChatSessionResponse> {
    return httpClient.post<ChatSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webchat/sessions`,
      { agentId },
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
};
