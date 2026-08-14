// modules/misc.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import { User } from '../types';
import type {
  CentrifugoTokenResponse,
  ReferralResponse,
} from '@/types';

export const miscApi = {
  async getUserInfo(): Promise<User> {
    return httpClient.get<User>(`${API.ENDPOINTS.USER_API}/user/me`);
  },

  // ========== REFERRAL ==========

  // The caller's own invite code. Answers only to an approved account — a GUEST
  // gets 403, since inviting is for someone who was let in themselves.
  async getReferral(): Promise<ReferralResponse> {
    return httpClient.get<ReferralResponse>(`${API.ENDPOINTS.USER_API}/referral`);
  },

  // ========== CENTRIFUGO ==========

  async getCentrifugoToken(): Promise<CentrifugoTokenResponse> {
    return httpClient.post<CentrifugoTokenResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/centrifugo/token`, {});
  },
};
