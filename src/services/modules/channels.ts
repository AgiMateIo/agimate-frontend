// modules/channels.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  ChannelResponse,
  ChannelHandlerResponse,
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelSessionResponse,
  ChannelSessionMessageResponse,
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

  async getChannelSessions(id: string): Promise<ChannelSessionResponse[]> {
    return httpClient.get<ChannelSessionResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/${id}/sessions/`,
    );
  },

  async getChannelSessionMessages(sessionId: string): Promise<ChannelSessionMessageResponse[]> {
    return httpClient.get<ChannelSessionMessageResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/sessions/${sessionId}/messages/`,
    );
  },

  async closeChannelSession(sessionId: string): Promise<ChannelSessionResponse> {
    return httpClient.post<ChannelSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/sessions/${sessionId}/close`,
      {},
    );
  },
};
