// modules/channels.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  ChannelResponse,
  ChannelHandlerResponse,
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelSessionResponse,
  ChannelSessionMessageResponse,
  PagedResponse,
} from '@/types';

export const channelsApi = {
  // Channels
  async getChannels(params?: { agentId?: string }): Promise<ChannelResponse[]> {
    const q = new URLSearchParams();
    if (params?.agentId) q.set('agentId', params.agentId);
    const qs = q.toString();
    return httpClient.get<ChannelResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/${qs ? `?${qs}` : ''}`,
    );
  },

  async getChannelHandlers(): Promise<ChannelHandlerResponse[]> {
    return httpClient.get<ChannelHandlerResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/handlers/`,
    );
  },

  async createChannel(data: CreateChannelRequest): Promise<ChannelResponse> {
    return httpClient.post<ChannelResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/channels/`, data);
  },

  async updateChannel(id: string, data: UpdateChannelRequest): Promise<ChannelResponse> {
    return httpClient.patch<ChannelResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/channels/${id}`, data);
  },

  async deleteChannel(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/channels/${id}`);
  },

  // Freshest activity first. Paged: `size` is capped at 100 server-side and the
  // response says which page actually came back — never assume the request won.
  async getChannelSessions(
    id: string,
    params?: { page?: number; size?: number },
  ): Promise<PagedResponse<ChannelSessionResponse>> {
    const query = buildPagedQuery({}, params);
    return httpClient.get<PagedResponse<ChannelSessionResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/${id}/sessions/?${query}`,
    );
  },

  // Newest-first, like webchat history: page 0 holds the latest messages and a
  // page has to be reversed to read as a transcript.
  async getChannelSessionMessages(
    sessionId: string,
    params?: { page?: number; size?: number },
  ): Promise<PagedResponse<ChannelSessionMessageResponse>> {
    const query = buildPagedQuery({}, params);
    return httpClient.get<PagedResponse<ChannelSessionMessageResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/sessions/${sessionId}/messages/?${query}`,
    );
  },

  async closeChannelSession(sessionId: string): Promise<ChannelSessionResponse> {
    return httpClient.post<ChannelSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/sessions/${sessionId}/close`,
      {},
    );
  },
};
