// api.ts
import { User } from './types';
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
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
  AppResponse,
  AppCreatedResponse,
  AppDetailResponse,
  CreateAppRequest,
  UpdateAppRequest,
  TriggerLog,
  DeviceTriggerGroup,
  DeviceToolGroup,
  AgentSettingsResponse,
  CreateAgentSettingsRequest,
  UpdateAgentSettingsRequest,
  ToolUseLogResponse,
  PagedResponse,
  Webhook,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookEventType,
  WebhookDeliveriesResponse,
} from '@/types';

const SERVICE_UNAVAILABLE_MESSAGE = 'SERVICE_UNAVAILABLE';
export const ACCESS_DENIED_MESSAGE = 'ACCESS_DENIED';

export class ApiError extends Error {
  details: Record<string, string> | null;

  constructor(message: string, details: Record<string, string> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
  }
}

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
    const errorObj = (errorData as { error: { message: string; details?: Record<string, string> } }).error;
    console.warn(`Backend error: ${errorObj.message}`);
    throw new ApiError(errorObj.message, errorObj.details ?? null);
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
      const isUserMeRequest = url.includes('/user/me');

      // Try to refresh the token once if unauthorized
      const refreshTokenId = getRefreshTokenId();
      if (!refreshTokenId) {
        if (isUserMeRequest) {
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        throw new Error(isUserMeRequest ? 'No refresh token available' : ACCESS_DENIED_MESSAGE);
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
          if (isUserMeRequest) {
            clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
          throw new Error(isUserMeRequest ? `HTTP ${response.status}: Unauthorized` : ACCESS_DENIED_MESSAGE);
        }
      } else {
        if (isUserMeRequest) {
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
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
    });

    return promise;
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
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
    return this.get<ConnectorsApiKey[]>(`${API.ENDPOINTS.USER_API}/manage/api-keys/`);
  }

  async createConnectorsApiKey(data: CreateConnectorsApiKeyRequest): Promise<ConnectorsApiKeyWithSecret> {
    return this.post<ConnectorsApiKeyWithSecret>(`${API.ENDPOINTS.USER_API}/manage/api-keys/`, data);
  }

  async updateConnectorsApiKey(keyId: string, data: UpdateConnectorsApiKeyRequest): Promise<ConnectorsApiKey> {
    return this.put<ConnectorsApiKey>(`${API.ENDPOINTS.USER_API}/manage/api-keys/${keyId}`, data);
  }

  async deleteConnectorsApiKey(keyId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.USER_API}/manage/api-keys/${keyId}`);
  }


  // ========== DEVICE API METHODS ==========

  // Apps
  async getApps(): Promise<AppResponse[]> {
    return this.get<AppResponse[]>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/`);
  }

  async createApp(data: CreateAppRequest): Promise<AppCreatedResponse> {
    return this.post<AppCreatedResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/`, data);
  }

  async getApp(id: string): Promise<AppResponse> {
    return this.get<AppResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/${id}`);
  }

  async getAppDetail(id: string): Promise<AppDetailResponse> {
    return this.get<AppDetailResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/${id}/detail`);
  }

  async updateApp(id: string, data: UpdateAppRequest): Promise<AppResponse> {
    return this.put<AppResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/${id}`, data);
  }

  async deleteApp(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/${id}`);
  }

  async regenerateAppKey(id: string): Promise<AppCreatedResponse> {
    return this.post<AppCreatedResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/${id}/regenerate`, {});
  }

  async disconnectApp(id: string): Promise<void> {
    return this.post(`${API.ENDPOINTS.DEVICE_API}/manage/apps/${id}/disconnect`, {});
  }

  // Agent Settings
  async getAgentSettingsList(): Promise<AgentSettingsResponse[]> {
    return this.get<AgentSettingsResponse[]>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-settings/`);
  }

  async createAgentSettings(data: CreateAgentSettingsRequest): Promise<AgentSettingsResponse> {
    return this.post<AgentSettingsResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-settings/`, data);
  }

  async getAgentSettings(apiKeyPubId: string): Promise<AgentSettingsResponse> {
    return this.get<AgentSettingsResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-settings/${apiKeyPubId}`);
  }

  async updateAgentSettings(apiKeyPubId: string, data: UpdateAgentSettingsRequest): Promise<AgentSettingsResponse> {
    return this.put<AgentSettingsResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-settings/${apiKeyPubId}`, data);
  }

  async deleteAgentSettings(apiKeyPubId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-settings/${apiKeyPubId}`);
  }

  // Tool Use Logs (paginated)
  async getToolUseLogs(params?: { apiKeyPubId?: string; page?: number; size?: number }): Promise<PagedResponse<ToolUseLogResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.apiKeyPubId) searchParams.set('apiKeyPubId', params.apiKeyPubId);
    searchParams.set('page', String(params?.page ?? 0));
    searchParams.set('size', String(params?.size ?? 20));
    const query = searchParams.toString();
    return this.get<PagedResponse<ToolUseLogResponse>>(`${API.ENDPOINTS.DEVICE_API}/manage/tool-use-logs/?${query}`);
  }

  // Device triggers
  async getDeviceTriggers(): Promise<DeviceTriggerGroup[]> {
    return this.get<DeviceTriggerGroup[]>(`${API.ENDPOINTS.DEVICE_API}/manage/triggers/`);
  }

  // Device tools
  async getDeviceTools(): Promise<DeviceToolGroup[]> {
    return this.get<DeviceToolGroup[]>(`${API.ENDPOINTS.DEVICE_API}/manage/tools/`);
  }

  // Trigger logs
  async getTriggerLogs(params?: { deviceId?: string; appPubId?: string }): Promise<TriggerLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.deviceId) searchParams.set('deviceId', params.deviceId);
    if (params?.appPubId) searchParams.set('appPubId', params.appPubId);
    const query = searchParams.toString();
    const page = await this.get<PagedResponse<TriggerLog>>(`${API.ENDPOINTS.DEVICE_API}/manage/trigger-logs/${query ? `?${query}` : ''}`);
    return page.content;
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
      return true;
    }
  }
}

const apiService = new ApiService();
export default apiService;