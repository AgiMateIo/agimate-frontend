// modules/auth.ts
// Getting into an account and managing the ways in.
//
// Everything here sits under `user/auth/…`, next to `user/oauth2/…` — one
// `user` segment, unlike the doubled `user/user/me`.
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type { AuthMethodResponse, LinkAuthMethodResponse } from '@/types';

const USER = API.ENDPOINTS.USER_API;

// The list's envelope is the one shape this backend documents only in an
// OpenAPI schema we cannot reach from here, so both plausible forms are
// accepted: a bare array, or one wrapped in a single key. A row missing `type`
// is classified by whether it names a provider.
function normalizeAuthMethods(payload: unknown): AuthMethodResponse[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object'
      ? (Object.values(payload as Record<string, unknown>).find(Array.isArray) as unknown[] | undefined) ?? []
      : [];

  return rows.map((row) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const provider = typeof item.provider === 'string' ? item.provider : null;
    const type = item.type === 'PASSWORD' || item.type === 'OAUTH'
      ? item.type
      : provider
        ? 'OAUTH'
        : 'PASSWORD';
    return {
      type,
      provider,
      email: typeof item.email === 'string' ? item.email : null,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
    };
  });
}

export const authApi = {
  // Answers 200 whether the address is free, taken, or has already had five
  // letters this hour: this endpoint is otherwise a check of who is registered
  // here. The screen can only promise "if the address can be registered, a
  // letter is on its way".
  //
  // No password in the request, and that is the point — it is named by whoever
  // opens the letter. The account itself appears on confirm, not here.
  async registerAccount(payload: { email: string; displayName?: string; ref?: string }): Promise<void> {
    await httpClient.authPost<void>(`${USER}/auth/register`, payload);
  },

  async resendRegistrationEmail(email: string): Promise<void> {
    await httpClient.authPost<void>(`${USER}/auth/register/resend`, { email });
  },

  // The account is created here, and the answer is a full sign-in.
  async confirmRegistration(token: string, password: string): Promise<void> {
    await httpClient.signIn(`${USER}/auth/register/confirm`, { token, password, client: 'WEB' });
  },

  // 401 covers an unknown address and a wrong password alike, in the same time —
  // there is nothing on this screen to tell them apart with. 429 carries how
  // long to wait in its message.
  async loginWithPassword(email: string, password: string): Promise<void> {
    await httpClient.signIn(`${USER}/auth/login`, { email, password, client: 'WEB' });
  },

  // "Forgot my password" and "add a password" are one operation and one letter.
  // Answers 200 always, for the same reason registration does.
  async requestPasswordReset(email: string): Promise<void> {
    await httpClient.authPost<void>(`${USER}/auth/password/forgot`, { email });
  },

  // Ends every session of the account, including the one that asked — someone
  // who has forgotten their password holds no session worth keeping, and the
  // likely reason they are here is that somebody else is holding one. So the
  // local tokens go with it.
  async resetPassword(token: string, password: string): Promise<void> {
    await httpClient.authPost<void>(`${USER}/auth/password/reset`, { token, password });
    httpClient.forgetSession();
  },

  // Ends every *other* session; this one survives. Knowing the current password
  // is no reason to make someone sign in again everywhere.
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await httpClient.post<void>(`${USER}/auth/password/change`, { currentPassword, newPassword });
  },

  // Trailing slash is significant. Open to a GUEST, like the devices list.
  async getAuthMethods(): Promise<AuthMethodResponse[]> {
    const payload = await httpClient.get<unknown>(`${USER}/auth/methods/`);
    return normalizeAuthMethods(payload);
  },

  // Step two of linking: the round trip established which provider, this call
  // says whose account — with a header a foreign page cannot send. All four
  // outcomes arrive as 200, two of them refusals; 403 means the proof is spent,
  // expired or forged and the round trip has to start over.
  async linkAuthMethod(proof: string): Promise<LinkAuthMethodResponse> {
    return httpClient.post<LinkAuthMethodResponse>(`${USER}/auth/methods/link`, { proof });
  },

  // Uppercase here, lowercase in the authorization URL — the first is an enum
  // value, the second the provider's own registration id.
  //
  // 400 when nothing would be left to sign in with; 404 when there was nothing
  // to unlink, which means the list on screen is stale.
  async unlinkOAuthMethod(provider: string): Promise<void> {
    await httpClient.delete<void>(`${USER}/auth/methods/oauth/${provider.toUpperCase()}`);
  },

  async unlinkPasswordMethod(): Promise<void> {
    await httpClient.delete<void>(`${USER}/auth/methods/password`);
  },
};
