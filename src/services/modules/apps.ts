// modules/apps.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AppResponse,
  AppCreatedResponse,
  UserAppDetailResponse,
  CreateAppRequest,
  UpdateAppRequest,
  PagedResponse,
} from '@/types';

export const appsApi = {
  // Apps (formerly Connectors)
  async getApps(params?: { page?: number; size?: number }): Promise<PagedResponse<AppResponse>> {
    return httpClient.get<PagedResponse<AppResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/?${buildPagedQuery({}, params)}`);
  },

  async createApp(data: CreateAppRequest): Promise<AppCreatedResponse> {
    return httpClient.post<AppCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/`, data);
  },

  async getApp(id: string): Promise<UserAppDetailResponse> {
    return httpClient.get<UserAppDetailResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/${id}`);
  },

  async updateApp(id: string, data: UpdateAppRequest): Promise<AppResponse> {
    return httpClient.put<AppResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/${id}`, data);
  },

  async deleteApp(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/${id}`);
  },

  async regenerateAppKey(id: string): Promise<AppCreatedResponse> {
    return httpClient.post<AppCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/${id}/regenerate`, {});
  },
};
