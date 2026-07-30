// modules/misc.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
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
};
