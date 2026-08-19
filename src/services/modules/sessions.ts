// modules/sessions.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type { UserSessionResponse } from '@/types';

export const sessionsApi = {
  // Active sign-ins, freshest `lastSeenAt` first — the order is the server's,
  // the screen does not re-sort. The trailing slash is significant: without it
  // the gateway answers 404.
  //
  // One `user` segment, not two: the doubled `user/user/me` is a wart of that
  // one controller, and these sit next to `user/oauth2/…` instead.
  //
  // Answers to a GUEST as well, deliberately: someone who has just lost a phone
  // is the first person who needs this list, and waiting for account approval
  // to reach it would be backwards.
  async getUserSessions(): Promise<UserSessionResponse[]> {
    return httpClient.get<UserSessionResponse[]>(`${API.ENDPOINTS.USER_API}/sessions/`);
  },

  // The device stops being able to refresh its tokens immediately; the access
  // token it already holds lives out its term (a day for web, an hour for the
  // app), so the UI must promise "will be signed out", not "right this second".
  // Push subscriptions go with the sign-in, so notifications do stop at once.
  //
  // 404 means "no such sign-in, or someone else's" — for this screen that is a
  // row already gone, which callers treat as success and re-read the list.
  async revokeUserSession(sessionId: string): Promise<void> {
    await httpClient.delete<string>(`${API.ENDPOINTS.USER_API}/sessions/${sessionId}`);
  },
};
