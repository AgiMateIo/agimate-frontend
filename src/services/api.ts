// api.ts
import { User } from './types';
import { API } from '@/config/constants';
import type {
  ConnectorInfo,
  MethodDefinition,
  ConnectorSummary,
  Credential,
  CreateCredentialRequest,
  UpdateCredentialRequest,
  CallMethodRequest,
  CallResult,
  ConnectorsApiKey,
  ConnectorsApiKeyWithSecret,
  CreateConnectorsApiKeyRequest,
  UpdateConnectorsApiKeyRequest,
  ConnectedDevice,
  DeviceAuthKeyResponse,
  DeviceAuthKeyCreatedResponse,
  CreateDeviceAuthKeyRequest,
  UpdateDeviceAuthKeyRequest,
  Webhook,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookEventType,
  WebhookDeliveriesResponse,
} from '@/types';

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://api.agimate.lc:8000/';
const BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

const SERVICE_UNAVAILABLE_MESSAGE = 'SERVICE_UNAVAILABLE';

// Wraps fetch to replace network errors with a user-friendly message
const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
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

// Helper function to extract data from nested response
const extractResponseData = <T>(data: T | { response: T }): T => {
  if (data && typeof data === 'object' && 'response' in data) {
    return (data as { response: T }).response;
  }
  return data as T;
};

// Helper function to handle error responses
const handleErrorResponse = async (response: Response): Promise<never> => {
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
    console.warn(`Backend error: ${(errorData as { error: { message: string } }).error.message}`);
    throw new Error((errorData as { error: { message: string } }).error.message);
  }

  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
};

// Helper function to store tokens in storage
const storeTokens = (accessToken: string, newRefreshTokenId: string) => {
  sessionStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token_id', newRefreshTokenId);
};

class ApiService {
  private tokenRefreshPromise: Promise<boolean> | null = null;

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
      const response = await safeFetch(`${BASE_URL}${API.ENDPOINTS.USER_API}/oauth2/refresh`, {
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

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Add authorization header if token exists
    const token = getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
    };

    let response = await safeFetch(url, config);

    if (response.status === 401 || response.status === 403) {
      // Try to refresh the token once if unauthorized
      const refreshTokenId = getRefreshTokenId();
      if (!refreshTokenId) {
        // No refresh token available, redirect to login
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('No refresh token available');
      }

      const refreshed = await this.refreshAccessToken(refreshTokenId);
      if (refreshed) {
        // Retry the request with the new token
        const newToken = getAccessToken();
        const retryHeaders = {
          'Content-Type': 'application/json',
          ...(newToken && { 'Authorization': `Bearer ${newToken}` }),
          ...options.headers,
        };

        response = await safeFetch(url, { ...options, headers: retryHeaders });

        if (response.status === 401 || response.status === 403) {
          // Token refresh failed, clear tokens and redirect to login
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error(`HTTP ${response.status}: Unauthorized`);
        }
      } else {
        // Token refresh failed, clear tokens and redirect to login
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error(`HTTP ${response.status}: Unauthorized`);
      }
    }

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    const jsonData = await response.json();
    return extractResponseData<T>(jsonData);
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    return this.makeRequest<T>(url);
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'DELETE',
    });
  }

  async getUserInfo(): Promise<User> {
    return this.get<User>(`${API.ENDPOINTS.USER_API}/user/me`);
  }

  // ========== CONNECTORS API METHODS ==========

  // Connectors
  async getConnectors(): Promise<ConnectorInfo[]> {
    return this.get<ConnectorInfo[]>(`${API.ENDPOINTS.CONNECTORS_API}/manage/connectors/`);
  }

  // Credentials
  async getCredentialsSummary(): Promise<ConnectorSummary[]> {
    return this.get<ConnectorSummary[]>(`${API.ENDPOINTS.CONNECTORS_API}/manage/credentials/`);
  }

  async getCredentials(connectorCode: string): Promise<Credential[]> {
    return this.get<Credential[]>(`${API.ENDPOINTS.CONNECTORS_API}/manage/credentials/${connectorCode}/`);
  }

  async createCredential(connectorCode: string, data: CreateCredentialRequest): Promise<Credential> {
    return this.post<Credential>(`${API.ENDPOINTS.CONNECTORS_API}/manage/credentials/${connectorCode}`, data);
  }

  async updateCredential(connectorCode: string, credentialId: string, data: UpdateCredentialRequest): Promise<Credential> {
    return this.put<Credential>(`${API.ENDPOINTS.CONNECTORS_API}/manage/credentials/${connectorCode}/${credentialId}`, data);
  }

  async deleteCredential(connectorCode: string, credentialId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONNECTORS_API}/manage/credentials/${connectorCode}/${credentialId}`);
  }


  // ConnectorsApiKey Management
  async getConnectorsApiKeys(): Promise<ConnectorsApiKey[]> {
    return this.get<ConnectorsApiKey[]>(`${API.ENDPOINTS.CONNECTORS_API}/manage/api-keys/`);
  }

  async createConnectorsApiKey(data: CreateConnectorsApiKeyRequest): Promise<ConnectorsApiKeyWithSecret> {
    return this.post<ConnectorsApiKeyWithSecret>(`${API.ENDPOINTS.CONNECTORS_API}/manage/api-keys/`, data);
  }

  async updateConnectorsApiKey(keyId: string, data: UpdateConnectorsApiKeyRequest): Promise<ConnectorsApiKey> {
    return this.put<ConnectorsApiKey>(`${API.ENDPOINTS.CONNECTORS_API}/manage/api-keys/${keyId}`, data);
  }

  async deleteConnectorsApiKey(keyId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONNECTORS_API}/manage/api-keys/${keyId}`);
  }

  async regenerateConnectorsApiKey(keyId: string): Promise<ConnectorsApiKeyWithSecret> {
    return this.post<ConnectorsApiKeyWithSecret>(`${API.ENDPOINTS.CONNECTORS_API}/manage/api-keys/${keyId}/regenerate`, {});
  }

  // ========== DEVICE API METHODS ==========

  // Connected devices
  async getConnectedDevices(): Promise<ConnectedDevice[]> {
    return this.get<ConnectedDevice[]>(`${API.ENDPOINTS.DEVICE_API}/manage/devices/`);
  }

  async disconnectDevice(connectionId: string): Promise<void> {
    return this.post(`${API.ENDPOINTS.DEVICE_API}/manage/devices/${connectionId}/disconnect`, {});
  }

  // Device auth keys
  async getDeviceAuthKeys(): Promise<DeviceAuthKeyResponse[]> {
    return this.get<DeviceAuthKeyResponse[]>(`${API.ENDPOINTS.DEVICE_API}/manage/device-keys/`);
  }

  async createDeviceAuthKey(data: CreateDeviceAuthKeyRequest): Promise<DeviceAuthKeyCreatedResponse> {
    return this.post<DeviceAuthKeyCreatedResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/device-keys/`, data);
  }

  async updateDeviceAuthKey(id: string, data: UpdateDeviceAuthKeyRequest): Promise<DeviceAuthKeyResponse> {
    return this.put<DeviceAuthKeyResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/device-keys/${id}`, data);
  }

  async deleteDeviceAuthKey(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/device-keys/${id}`);
  }

  // ========== WEBHOOKS API METHODS ==========

  // Get all webhooks (with optional event type filter)
  async getWebhooks(eventType?: string): Promise<Webhook[]> {
    const query = eventType ? `?eventType=${encodeURIComponent(eventType)}` : '';
    return this.get<Webhook[]>(`${API.ENDPOINTS.CONNECTORS_API}/manage/webhooks/${query}`);
  }

  // Get webhook by ID
  async getWebhook(webhookId: string): Promise<Webhook> {
    return this.get<Webhook>(`${API.ENDPOINTS.CONNECTORS_API}/manage/webhooks/${webhookId}`);
  }

  // Create new webhook
  async createWebhook(data: CreateWebhookRequest): Promise<Webhook> {
    return this.post<Webhook>(`${API.ENDPOINTS.CONNECTORS_API}/manage/webhooks`, data);
  }

  // Update webhook
  async updateWebhook(webhookId: string, data: UpdateWebhookRequest): Promise<Webhook> {
    return this.put<Webhook>(`${API.ENDPOINTS.CONNECTORS_API}/manage/webhooks/${webhookId}`, data);
  }

  // Delete webhook
  async deleteWebhook(webhookId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONNECTORS_API}/manage/webhooks/${webhookId}`);
  }

  // Get available event types (with optional filter)
  async getEventTypes(eventTypeLike?: string): Promise<WebhookEventType[]> {
    const query = eventTypeLike ? `?event_type_like=${encodeURIComponent(eventTypeLike)}` : '';
    return this.get<WebhookEventType[]>(`${API.ENDPOINTS.CONNECTORS_API}/manage/events/${query}`);
  }

  // Get webhook deliveries (history)
  async getWebhookDeliveries(webhookId: string, page = 0, size = 20): Promise<WebhookDeliveriesResponse> {
    return this.get<WebhookDeliveriesResponse>(
      `${API.ENDPOINTS.CONNECTORS_API}/manage/webhooks/${webhookId}/deliveries?page=${page}&size=${size}`
    );
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
        const response = await safeFetch(`${BASE_URL}${API.ENDPOINTS.USER_API}/oauth2/logout`, {
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
      return true;
    }
  }
}

const apiService = new ApiService();
export default apiService;