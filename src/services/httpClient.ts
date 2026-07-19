// httpClient.ts
// Transport core: fetch wrapper, token refresh, error mapping, GET dedup.
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
import { routing } from '@/i18n/routing';

const SERVICE_UNAVAILABLE_MESSAGE = 'SERVICE_UNAVAILABLE';
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
const clearTokens = () => {
  sessionStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token_id');
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
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
};

// Helper function to store tokens in storage
const storeTokens = (accessToken: string, newRefreshTokenId: string) => {
  sessionStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token_id', newRefreshTokenId);
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

  // Private method to refresh access token using refresh token from storage - calls /oauth2/refresh endpoint
  private async refreshAccessToken(refreshTokenId?: string): Promise<boolean> {
    const tokenToUse = refreshTokenId || getRefreshTokenId();

    if (!tokenToUse) {
      return false;
    }

    // If there's already a refresh in progress, return the same promise to prevent multiple calls
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
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

  private async performTokenRefresh(tokenToUse: string): Promise<boolean> {
    try {
      const response = await safeFetch(`${getApiBaseUrl()}${API.ENDPOINTS.USER_API}/oauth2/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshTokenId: tokenToUse }),
      });

      if (response.ok) {
        const jsonData = await response.json();
        const data = extractResponseData<{accessToken: string, refreshTokenId: string}>(jsonData);

        // Store tokens using the helper function
        storeTokens(data.accessToken, data.refreshTokenId);

        return true;
      } else {
        console.error('Failed to refresh token:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error during token refresh:', error);
      return false;
    }
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

  // Method to refresh authentication tokens from URL fragment - uses the same refreshAccessToken method
  async refreshAuthTokens(refreshTokenId: string): Promise<boolean> {
    // Use the same refresh method for consistency
    return this.refreshAccessToken(refreshTokenId);
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
    }
    return true;
  }
}

export const httpClient = new HttpClient();
