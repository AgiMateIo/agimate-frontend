// httpClient.ts
// Transport core: fetch wrapper, token refresh, error mapping, GET dedup.
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
import { routing } from '@/i18n/routing';
import { clearCurrentSessionId, setCurrentSessionId } from './currentSession';
import type { TokenPairResponse } from '@/types/auth';

const SERVICE_UNAVAILABLE_MESSAGE = 'SERVICE_UNAVAILABLE';
// A backend failure that carried no message of its own: a gateway HTML page, an
// empty body, a shape we don't know. Thrown as a code rather than "HTTP 502: Bad
// Gateway" so ErrorAlert can translate it — the status is still on the error and
// in the console for whoever is debugging.
const SERVER_ERROR_MESSAGE = 'SERVER_ERROR';
const ACCESS_DENIED_MESSAGE = 'ACCESS_DENIED';

export class ApiError extends Error {
  details: Record<string, string> | null;
  // HTTP status of the backend error response (413 = payload too large,
  // 429 = rate limited, …); undefined for errors thrown outside the transport.
  status?: number;

  constructor(message: string, details: Record<string, string> | null = null, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
    this.status = status;
  }
}

// Wraps fetch to replace network errors with a user-friendly message
export const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
    }
    throw error;
  }
};

// Helper functions to handle storage
const getAccessToken = (): string | null => typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
const getRefreshTokenId = (): string | null => typeof window !== 'undefined' ? localStorage.getItem('refresh_token_id') : null;
// When the background refresh is due — an absolute timestamp, computed once from
// the `expiresIn` the backend sent. Stored rather than kept in memory because a
// second tab starts with tokens it never saw issued, and has to know when the
// shared sign-in needs its next refresh.
const REFRESH_AT_KEY = 'access_token_refresh_at';
const getRefreshAt = (): number | null => {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(REFRESH_AT_KEY);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
};
// Whether this browser holds a sign-in that can be restored. The id alone is not
// the credential — the refresh token itself lives in an HTTP-only cookie — but its
// presence is what makes /user/me worth attempting, and what tells the login page
// that a sign-in may already exist.
export const hasStoredSession = (): boolean =>
  typeof window !== 'undefined' && localStorage.getItem('refresh_token_id') !== null;

const clearTokens = () => {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem(REFRESH_AT_KEY);
  localStorage.removeItem('refresh_token_id');
  clearCurrentSessionId();
};

// Hard-redirects to the login page, preserving the current locale prefix
// (the next-intl middleware would otherwise bounce through the default locale).
const clearTokensAndRedirectToLogin = () => {
  clearTokens();
  if (typeof window === 'undefined') return;
  const [, maybeLocale] = window.location.pathname.split('/');
  const prefix = (routing.locales as readonly string[]).includes(maybeLocale)
    ? `/${maybeLocale}`
    : '';
  window.location.href = `${prefix}/login`;
};

// Helper function to extract data from nested response
export const extractResponseData = <T>(data: T | { response: T }): T => {
  if (data && typeof data === 'object' && 'response' in data) {
    return (data as { response: T }).response;
  }
  return data as T;
};

// Helper function to handle error responses
export const handleErrorResponse = async (response: Response): Promise<never> => {
  let errorData: unknown = null;
  try {
    errorData = await response.json();
  } catch {
    // If response is not JSON, throw with status text
    console.warn(`Non-JSON error response: HTTP ${response.status}: ${response.statusText}`);
    throw new ApiError(SERVER_ERROR_MESSAGE, null, response.status);
  }

  // Handle nested error structure with "error.message"
  if (
    errorData &&
    typeof errorData === 'object' &&
    (errorData as { error?: { message?: string } }).error?.message
  ) {
    const errorObj = (errorData as { error: { message: string; details?: Record<string, string> } }).error;
    console.warn(`Backend error: ${errorObj.message}`);
    throw new ApiError(errorObj.message, errorObj.details ?? null, response.status);
  }

  console.warn(`Error response without a message: HTTP ${response.status}: ${response.statusText}`);
  throw new ApiError(SERVER_ERROR_MESSAGE, null, response.status);
};

// Helper function to store tokens in storage
const storeTokens = (pair: TokenPairResponse) => {
  sessionStorage.setItem('access_token', pair.accessToken);
  localStorage.setItem('refresh_token_id', pair.refreshTokenId);
  // The lifetime comes from the response, never from a constant here: it was
  // a day, it is an hour, and it will change again without telling clients.
  // Refresh at 90% of it, leaving the last tenth as the margin a slow network
  // gets to use. A backend that omits the field leaves the reactive 401 retry
  // as the only path, which is what this code did before it existed.
  if (typeof pair.expiresIn === 'number' && pair.expiresIn > 0) {
    sessionStorage.setItem(REFRESH_AT_KEY, String(Date.now() + pair.expiresIn * 900));
  } else {
    sessionStorage.removeItem(REFRESH_AT_KEY);
  }
  // Comes with every refresh and does not change until the sign-in ends. Kept
  // because the sessions screen has no other way to tell which row is this
  // device; an older backend that omits it leaves the row unmarked.
  setCurrentSessionId(pair.sessionId);
};

// Builds a query string from optional filters plus paging (defaults page=0, size=20).
export const buildPagedQuery = (
  filters: Record<string, string | undefined>,
  params?: { page?: number; size?: number },
): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  query.set('page', String(params?.page ?? 0));
  query.set('size', String(params?.size ?? 20));
  return query.toString();
};

class HttpClient {
  private tokenRefreshPromise: Promise<boolean> | null = null;
  private inflightGetRequests = new Map<string, Promise<unknown>>();
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Refreshes the access token before it expires, at 90% of the lifetime the
  // backend reported. This does not replace the reactive refresh on 401: a
  // laptop asleep through the window wakes up holding a dead token either way.
  // Both halves are needed, and neither is enough alone.
  private scheduleProactiveRefresh() {
    if (typeof window === 'undefined') return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;

    const refreshAt = getRefreshAt();
    if (refreshAt === null || !getRefreshTokenId()) return;

    // setTimeout takes a signed 32-bit delay; anything longer fires at once. No
    // hour-long token comes near that, but the number is the backend's to change.
    const delay = Math.min(Math.max(refreshAt - Date.now(), 0), 2 ** 31 - 1);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      // A failure needs no handling here: the session is either still fine (the
      // network blipped, and the next request's 401 retries) or it is gone, and
      // the first request to notice does the redirect.
      void this.refreshAccessToken();
    }, delay);
  }

  // Called once by the app shell. Arms the background refresh for a tab that
  // opened onto an existing sign-in — the timer above is set when tokens are
  // stored, which a second tab never sees happen.
  startTokenLifecycle(): () => void {
    this.scheduleProactiveRefresh();
    return () => {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    };
  }

  // Private method to refresh access token using refresh token from storage - calls /oauth2/refresh endpoint
  private async refreshAccessToken(refreshTokenId?: string): Promise<boolean> {
    const tokenToUse = refreshTokenId || getRefreshTokenId();

    if (!tokenToUse) {
      return false;
    }

    // If there's already a refresh in progress, return the same promise to prevent multiple calls
    if (this.tokenRefreshPromise) {
      // Piggybacking callers only need the boolean — the initiator below logs
      // the reason, so a rejection must not escape through them.
      return this.tokenRefreshPromise.catch(() => false);
    }

    // Create a new refresh promise
    this.tokenRefreshPromise = this.performTokenRefresh(tokenToUse);

    try {
      return await this.tokenRefreshPromise;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  // Throws when the gateway is unreachable (safeFetch maps that to
  // SERVICE_UNAVAILABLE); returns false when the backend rejected the refresh
  // token. The two are kept apart on purpose: refreshAccessToken flattens both
  // into false for the silent 401 retry, while the OAuth callback screen has to
  // tell "try again" from "sign in again".
  private async performTokenRefresh(tokenToUse: string, isRetry = false): Promise<boolean> {
    const response = await safeFetch(`${getApiBaseUrl()}${API.ENDPOINTS.USER_API}/oauth2/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshTokenId: tokenToUse }),
    });

    // 409 — another tab or device rotated the refresh token first. The rotation
    // succeeded, it just wasn't ours: the id in storage is the current one now,
    // so retry with that rather than reading a live session as a dead one. Once
    // only — a second 409 is a loop, not a race.
    if (response.status === 409 && !isRetry) {
      return this.performTokenRefresh(getRefreshTokenId() ?? tokenToUse, true);
    }

    if (!response.ok) {
      // 403 here is "already rotated — session revoked": the same id was
      // presented after the replay window, which reads as the token existing in
      // two places. The backend closed the session; for us that is a sign-out,
      // and the false below is what makes it one.
      console.error('Failed to refresh token:', response.status);
      return false;
    }

    const jsonData = await response.json();
    const data = extractResponseData<TokenPairResponse>(jsonData);

    // Store tokens using the helper function
    storeTokens(data);
    this.scheduleProactiveRefresh();

    return true;
  }

  // Builds request headers with the current access token attached. FormData
  // bodies get no Content-Type — the browser sets multipart/… with a boundary.
  private buildHeaders(options: RequestInit): HeadersInit {
    const token = getAccessToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    return {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };
  }

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const isUserMeRequest = url.includes('/user/me');

    let response = await safeFetch(url, { ...options, headers: this.buildHeaders(options) });

    // 403 Forbidden — permission denied, token refresh won't help. For /user/me
    // it means the session is unusable: clear tokens and start over at login.
    if (response.status === 403) {
      if (isUserMeRequest) {
        clearTokensAndRedirectToLogin();
      }
      return handleErrorResponse(response);
    }

    if (response.status === 401) {
      // Try to refresh the token once if unauthorized
      const refreshTokenId = getRefreshTokenId();
      if (!refreshTokenId) {
        if (isUserMeRequest) {
          clearTokensAndRedirectToLogin();
        }
        throw new Error(isUserMeRequest ? 'No refresh token available' : ACCESS_DENIED_MESSAGE);
      }

      const refreshed = await this.refreshAccessToken(refreshTokenId);
      if (refreshed) {
        // Retry the request with the new token
        response = await safeFetch(url, { ...options, headers: this.buildHeaders(options) });

        if (response.status === 403) {
          return handleErrorResponse(response);
        }

        if (response.status === 401) {
          if (isUserMeRequest) {
            clearTokensAndRedirectToLogin();
          }
          throw new Error(isUserMeRequest ? `HTTP ${response.status}: Unauthorized` : ACCESS_DENIED_MESSAGE);
        }
      } else {
        if (isUserMeRequest) {
          clearTokensAndRedirectToLogin();
        }
        throw new Error(isUserMeRequest ? `HTTP ${response.status}: Unauthorized` : ACCESS_DENIED_MESSAGE);
      }
    }

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    const jsonData = await response.json();
    return extractResponseData<T>(jsonData);
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;

    const existing = this.inflightGetRequests.get(url);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = this.makeRequest<T>(url);
    this.inflightGetRequests.set(url, promise);
    promise.finally(() => {
      this.inflightGetRequests.delete(url);
    }).catch(() => {});

    return promise;
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Multipart POST (file uploads). The FormData body goes through the same
  // token-refresh/retry/unwrap pipeline as JSON requests.
  async postForm<T>(endpoint: string, form: FormData): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: form,
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'DELETE',
    });
  }

  // Exchanges the refresh token id from the OAuth callback fragment. Unlike the
  // internal retry path this does not swallow the failure reason: a rejected
  // exchange resolves false, an unreachable gateway throws. Dedup is skipped —
  // it runs once on page load, with no concurrent refresh to join.
  async refreshAuthTokens(refreshTokenId: string): Promise<boolean> {
    return this.performTokenRefresh(refreshTokenId);
  }

  // A public auth endpoint: registration, password reset, sign-in. No bearer
  // (there is no session yet, and a stale one must not be sent), and no refresh
  // on 401 — a 401 here is a wrong password, not an expired token.
  //
  // `withCookies` is for the two calls that end in a sign-in: the web's refresh
  // token comes back as an httpOnly cookie, which only rides along on a
  // credentialed request. The others send nothing worth a cookie.
  async authPost<T>(endpoint: string, data: unknown, withCookies = false): Promise<T> {
    const response = await safeFetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'POST',
      ...(withCookies && { credentials: 'include' as const }),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    // Several of these answer 200 with nothing in the body (registration is
    // deliberately answerless), and response.json() on an empty body throws.
    const text = await response.text();
    return text ? extractResponseData<T>(JSON.parse(text)) : (undefined as T);
  }

  // A sign-in that ends in this browser holding the session: the password login
  // and the confirmation link that creates the account. Same storage, same
  // background refresh as the OAuth path — only the way the pair was earned
  // differs.
  async signIn(endpoint: string, data: unknown): Promise<void> {
    const pair = await this.authPost<TokenPairResponse>(endpoint, data, true);
    storeTokens(pair);
    this.scheduleProactiveRefresh();
  }

  // Drops the local half of a sign-in without asking the backend to end it —
  // for the case where the backend already has: a password reset closes every
  // session of the account, including the one that asked for it.
  forgetSession(): void {
    if (typeof window === 'undefined') return;
    clearTokens();
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  // Logout function to call backend endpoint and clear all stored tokens
  async logout(): Promise<boolean> {
    const refreshTokenId = getRefreshTokenId();

    try {
      // Only call the backend logout endpoint if we have a refresh token
      if (refreshTokenId) {
        const response = await safeFetch(`${getApiBaseUrl()}${API.ENDPOINTS.USER_API}/oauth2/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshTokenId }),
        });

        if (!response.ok) {
          console.error('Logout request failed:', response.status);
          // Even if the backend call fails, we should still clear the local storage
        }
      }
    } catch (error) {
      console.error('Error during logout request:', error);
    } finally {
      // Clear all stored tokens regardless of backend response
      clearTokens();
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    return true;
  }
}

export const httpClient = new HttpClient();
