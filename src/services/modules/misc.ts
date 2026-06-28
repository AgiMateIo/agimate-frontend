// modules/misc.ts
import { httpClient, safeFetch, handleErrorResponse, extractResponseData } from '../httpClient';
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
import { User } from '../types';
import type {
  CentrifugoTokenResponse,
} from '@/types';

export const miscApi = {
  async getUserInfo(): Promise<User> {
    return httpClient.get<User>(`${API.ENDPOINTS.USER_API}/user/me`);
  },

  // ========== CENTRIFUGO ==========

  async getCentrifugoToken(): Promise<CentrifugoTokenResponse> {
    return httpClient.post<CentrifugoTokenResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/centrifugo/token`, {});
  },

  // ========== PUBLIC (UNAUTHENTICATED) METHODS ==========

  async joinWaitlist(data: { email: string; name: string; message?: string }): Promise<{ registrationCode: string }> {
    const url = `${getApiBaseUrl()}${API.ENDPOINTS.USER_API}/waitlist`;
    const response = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    const jsonData = await response.json();
    return extractResponseData<{ registrationCode: string }>(jsonData);
  },
};
