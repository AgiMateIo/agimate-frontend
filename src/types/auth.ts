// types/auth.ts
// Ways into an account: the token pair every sign-in path ends at, and the
// list of doors one account has.

// Lowercase in the authorization URL (`/oauth2/authorization/github`), uppercase
// in the unlink path and in the methods list (`/auth/methods/oauth/GITHUB`).
// Both spellings are the backend's, and neither is a typo: the first is the
// provider's own registration id, the second an enum value.
export type OAuthProviderCode = 'github' | 'google' | 'yandex' | 'vk';

// What every sign-in path — password, provider, app code exchange — answers with.
export interface TokenPairResponse {
  accessToken: string;
  refreshTokenId: string;
  // Always null for the web: its refresh token goes into an httpOnly cookie, and
  // a copy in the body readable by script would defeat the cookie.
  refreshToken: string | null;
  // Seconds, and the only source of the access token's lifetime — the backend
  // changes it without warning clients, so nothing here may hardcode an hour.
  expiresIn: number;
  // The row of this device in the sessions list.
  sessionId?: string;
}

export type AuthMethodKind = 'OAUTH' | 'PASSWORD';

// One row per way in: providers oldest to newest, password last.
export interface AuthMethodResponse {
  type: AuthMethodKind;
  // OAUTH rows only, uppercase (`GITHUB`).
  provider: string | null;
  // Legitimately null on a provider linked by hand — it is free not to report
  // an address, and the password row carries the account's own.
  email: string | null;
  createdAt: string | null;
}

// LINKED and ALREADY_YOURS are success; TAKEN and PROVIDER_OCCUPIED are refusals
// — and all four arrive with HTTP 200, because the request itself was fine.
export type LinkOutcome = 'LINKED' | 'ALREADY_YOURS' | 'TAKEN' | 'PROVIDER_OCCUPIED';

export interface LinkAuthMethodResponse {
  provider: string;
  outcome: LinkOutcome;
}
