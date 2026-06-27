// api.ts
import { User } from './types';
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
import type {
  AppResponse,
  AppCreatedResponse,
  UserAppDetailResponse,
  CreateAppRequest,
  UpdateAppRequest,
  TriggerLog,
  TriggerLogProbeResponse,
  ConnectorToolSpec,
  DeviceTriggerGroup,
  DeviceToolGroup,
  AgentResponse,
  AgentSummaryResponse,
  AgentCreatedResponse,
  CreateAgentRequest,
  UpdateAgentRequest,
  ToolUseLogResponse,
  PagedResponse,
  ConnectorJobResponse,
  ConnectorJobKind,
  WebhookDeliveryLogsResponse,
  AgenticTeam,
  CreateAgenticTeamRequest,
  UpdateAgenticTeamRequest,
  IntegrationResponse,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  UpdateIntegrationCredentialsRequest,
  IntegrationTestResult,
  AgentConnectionResponse,
  BindConnectionRequest,
  AgentConnectionPolicyResponse,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  DeviceToolInfo,
  DeviceTriggerInfo,
  Board,
  BoardTask,
  BoardTaskComment,
  TasksByStatus,
  CreateBoardRequest,
  CreateTaskRequest,
  ChangeTaskStatusRequest,
  CreateCommentRequest,
  SkillResponse,
  SkillDetailResponse,
  CreateSkillRequest,
  UpdateSkillRequest,
  ConnectorCatalogEntry,
  AgentSkillResponse,
  CreateAgentSkillRequest,
  CentrifugoTokenResponse,
  LlmProviderResponse,
  CreateLlmProviderRequest,
  UpdateLlmProviderRequest,
  RefreshModelsResponse,
  AgentLlmResponse,
  CreateAgentLlmRequest,
  UpdateAgentLlmRequest,
  ChannelResponse,
  ChannelHandlerResponse,
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelSessionResponse,
  ChannelSessionMessageResponse,
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

    // 403 Forbidden — permission denied, token refresh won't help
    if (response.status === 403) {
      return handleErrorResponse(response);
    }

    if (response.status === 401) {
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

        if (response.status === 403) {
          return handleErrorResponse(response);
        }

        if (response.status === 401) {
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

  private async makeFormDataRequest<T>(url: string, formData: FormData): Promise<T> {
    const token = getAccessToken();
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    let response = await safeFetch(url, { method: 'POST', headers, body: formData });

    if (response.status === 403) {
      return handleErrorResponse(response);
    }

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const newToken = getAccessToken();
        const retryHeaders: HeadersInit = {
          ...(newToken && { Authorization: `Bearer ${newToken}` }),
        };
        response = await safeFetch(url, { method: 'POST', headers: retryHeaders, body: formData });
        if (response.status === 401) {
          throw new Error(ACCESS_DENIED_MESSAGE);
        }
      } else {
        throw new Error(ACCESS_DENIED_MESSAGE);
      }
    }

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    const jsonData = await response.json();
    return extractResponseData<T>(jsonData);
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    return this.makeFormDataRequest<T>(url, formData);
  }

  async getUserInfo(): Promise<User> {
    return this.get<User>(`${API.ENDPOINTS.USER_API}/user/me`);
  }

  // ========== DEVICE API METHODS ==========

  // Apps (formerly Connectors)
  async getApps(params?: { page?: number; size?: number }): Promise<PagedResponse<AppResponse>> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params?.page ?? 0));
    searchParams.set('size', String(params?.size ?? 20));
    const query = searchParams.toString();
    return this.get<PagedResponse<AppResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/?${query}`);
  }

  async createApp(data: CreateAppRequest): Promise<AppCreatedResponse> {
    return this.post<AppCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/`, data);
  }

  async getApp(id: string): Promise<UserAppDetailResponse> {
    return this.get<UserAppDetailResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/${id}`);
  }

  async updateApp(id: string, data: UpdateAppRequest): Promise<AppResponse> {
    return this.put<AppResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/${id}`, data);
  }

  async deleteApp(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/${id}`);
  }

  async regenerateAppKey(id: string): Promise<AppCreatedResponse> {
    return this.post<AppCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/apps/${id}/regenerate`, {});
  }

  // Agents
  async getAgentsList(params?: { agenticTeamId?: string; search?: string; page?: number; size?: number }): Promise<PagedResponse<AgentResponse>> {
    const query = new URLSearchParams();
    if (params?.agenticTeamId) query.set('agenticTeamId', params.agenticTeamId);
    if (params?.search) query.set('search', params.search);
    query.set('page', String(params?.page ?? 0));
    query.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<AgentResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/?${query}`);
  }

  async createAgent(data: CreateAgentRequest): Promise<AgentCreatedResponse> {
    return this.post<AgentCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/`, data);
  }

  async getAgent(id: string): Promise<AgentResponse> {
    return this.get<AgentResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}`);
  }

  async updateAgent(id: string, data: UpdateAgentRequest): Promise<AgentResponse> {
    return this.put<AgentResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}`, data);
  }

  async deleteAgent(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}`);
  }

  async regenerateAgentKey(id: string): Promise<AgentCreatedResponse> {
    return this.post<AgentCreatedResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${id}/regenerate`, {});
  }

  // Agent connections (bindings) — give an agent access to a connector instance
  async getAgentConnections(agentId: string): Promise<AgentConnectionResponse[]> {
    return this.get<AgentConnectionResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/connections/`);
  }

  async bindAgentConnection(agentId: string, data: BindConnectionRequest): Promise<AgentConnectionResponse> {
    return this.post<AgentConnectionResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/connections/`, data);
  }

  async unbindAgentConnection(agentId: string, connectionId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/connections/${connectionId}`);
  }

  // Connection policies — refine a binding (default-allow; policies narrow access)
  async getAgentConnectionPolicies(agentConnectionId: string): Promise<AgentConnectionPolicyResponse[]> {
    return this.get<AgentConnectionPolicyResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-connections/${agentConnectionId}/policies/`);
  }

  async createAgentConnectionPolicy(agentConnectionId: string, data: CreatePolicyRequest): Promise<AgentConnectionPolicyResponse> {
    return this.post<AgentConnectionPolicyResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-connections/${agentConnectionId}/policies/`, data);
  }

  async updateAgentConnectionPolicy(agentConnectionId: string, policyId: string, data: UpdatePolicyRequest): Promise<AgentConnectionPolicyResponse> {
    return this.patch<AgentConnectionPolicyResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-connections/${agentConnectionId}/policies/${policyId}`, data);
  }

  async deleteAgentConnectionPolicy(agentConnectionId: string, policyId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-connections/${agentConnectionId}/policies/${policyId}`);
  }

  // Agent-Skill bindings
  async getAgentSkills(params: { agentId: string; page?: number; size?: number }): Promise<PagedResponse<AgentSkillResponse>> {
    const q = new URLSearchParams();
    q.set('page', String(params.page ?? 0));
    q.set('size', String(params.size ?? 20));
    return this.get<PagedResponse<AgentSkillResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${params.agentId}/skills/?${q}`);
  }

  async bindAgentSkill(agentId: string, data: CreateAgentSkillRequest): Promise<AgentSkillResponse> {
    return this.post<AgentSkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/`, data);
  }

  async unbindAgentSkill(agentId: string, skillId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/skills/${skillId}`);
  }

  // LLM Providers
  async getLlmProviders(): Promise<LlmProviderResponse[]> {
    return this.get<LlmProviderResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/`);
  }

  async createLlmProvider(data: CreateLlmProviderRequest): Promise<LlmProviderResponse> {
    return this.post<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/`, data);
  }

  async getLlmProvider(id: string): Promise<LlmProviderResponse> {
    return this.get<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}`);
  }

  async updateLlmProvider(id: string, data: UpdateLlmProviderRequest): Promise<LlmProviderResponse> {
    return this.patch<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}`, data);
  }

  async deleteLlmProvider(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}`);
  }

  async refreshLlmProviderModels(id: string): Promise<RefreshModelsResponse> {
    return this.post<RefreshModelsResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}/refresh-models`, {});
  }

  // Agent ↔ LLM bindings
  async getAgentLlms(agentId: string): Promise<AgentLlmResponse[]> {
    return this.get<AgentLlmResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/`);
  }

  async createAgentLlm(agentId: string, data: CreateAgentLlmRequest): Promise<AgentLlmResponse> {
    return this.post<AgentLlmResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/`, data);
  }

  async updateAgentLlm(agentId: string, name: string, data: UpdateAgentLlmRequest): Promise<AgentLlmResponse> {
    return this.put<AgentLlmResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/${encodeURIComponent(name)}`, data);
  }

  async deleteAgentLlm(agentId: string, name: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/llms/${encodeURIComponent(name)}`);
  }

  // Channels
  async getChannels(params?: { agentId?: string }): Promise<ChannelResponse[]> {
    const q = new URLSearchParams();
    if (params?.agentId) q.set('agentId', params.agentId);
    const qs = q.toString();
    return this.get<ChannelResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/${qs ? `?${qs}` : ''}`,
    );
  }

  async getChannelHandlers(): Promise<ChannelHandlerResponse[]> {
    return this.get<ChannelHandlerResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/handlers/`,
    );
  }

  async getChannel(id: string): Promise<ChannelResponse> {
    return this.get<ChannelResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/channels/${id}`);
  }

  async createChannel(data: CreateChannelRequest): Promise<ChannelResponse> {
    return this.post<ChannelResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/channels/`, data);
  }

  async updateChannel(id: string, data: UpdateChannelRequest): Promise<ChannelResponse> {
    return this.patch<ChannelResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/channels/${id}`, data);
  }

  async deleteChannel(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/channels/${id}`);
  }

  async getChannelSessions(id: string): Promise<ChannelSessionResponse[]> {
    return this.get<ChannelSessionResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/${id}/sessions/`,
    );
  }

  async getChannelSessionMessages(sessionId: string): Promise<ChannelSessionMessageResponse[]> {
    return this.get<ChannelSessionMessageResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/sessions/${sessionId}/messages/`,
    );
  }

  async closeChannelSession(sessionId: string): Promise<ChannelSessionResponse> {
    return this.post<ChannelSessionResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/channels/sessions/${sessionId}/close`,
      {},
    );
  }

  // App resources
  async getAppTools(appId: string): Promise<DeviceToolInfo[]> {
    return this.get<DeviceToolInfo[]>(`${API.ENDPOINTS.CONTROL_API}/manage/app-tools/${appId}`);
  }

  async getAppTriggers(appId: string): Promise<DeviceTriggerInfo[]> {
    return this.get<DeviceTriggerInfo[]>(`${API.ENDPOINTS.CONTROL_API}/manage/app-triggers/${appId}`);
  }

  // Integration resources
  async getIntegrationTools(connectorCode: string): Promise<ConnectorToolSpec[]> {
    return this.get<ConnectorToolSpec[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/integrations/tools/?connectorCode=${encodeURIComponent(connectorCode)}`
    );
  }

  async getIntegrationTriggers(connectorCode: string): Promise<DeviceTriggerInfo[]> {
    return this.get<DeviceTriggerInfo[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/integrations/triggers/?connectorCode=${encodeURIComponent(connectorCode)}`
    );
  }

  // Tool specifications (MCP-compatible ConnectorToolSpec with JSON-Schema inputSchema).
  // For APP connectors `identity` is required; for INTEGRATION / INTERNAL_SERVICE it's ignored.
  async getToolSpecifications(
    connectorCode: string,
    identity?: string,
  ): Promise<Record<string, ConnectorToolSpec>> {
    const query = identity ? `?identity=${encodeURIComponent(identity)}` : '';
    return this.get<Record<string, ConnectorToolSpec>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/tools/${encodeURIComponent(connectorCode)}/${query}`,
    );
  }

  async getToolSpecification(
    connectorCode: string,
    toolName: string,
    identity?: string,
  ): Promise<ConnectorToolSpec> {
    const query = identity ? `?identity=${encodeURIComponent(identity)}` : '';
    return this.get<ConnectorToolSpec>(
      `${API.ENDPOINTS.CONTROL_API}/manage/tools/${encodeURIComponent(connectorCode)}/${encodeURIComponent(toolName)}${query}`,
    );
  }

  // Tool Use Logs (paginated)
  async getToolUseLogs(params?: { agentId?: string; page?: number; size?: number }): Promise<PagedResponse<ToolUseLogResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.agentId) searchParams.set('agentId', params.agentId);
    searchParams.set('page', String(params?.page ?? 0));
    searchParams.set('size', String(params?.size ?? 20));
    const query = searchParams.toString();
    return this.get<PagedResponse<ToolUseLogResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/tool-call-logs/?${query}`);
  }

  // Connector tasks (paginated, sorted by nextRunAt ascending on the backend)
  async getConnectorJobs(params?: { connectorCode?: string; kind?: ConnectorJobKind; page?: number; size?: number }): Promise<PagedResponse<ConnectorJobResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.connectorCode) searchParams.set('connectorCode', params.connectorCode);
    if (params?.kind) searchParams.set('kind', params.kind);
    searchParams.set('page', String(params?.page ?? 0));
    searchParams.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<ConnectorJobResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/?${searchParams.toString()}`);
  }

  async pauseConnectorJob(id: string): Promise<void> {
    await this.post<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/${encodeURIComponent(id)}/pause`, {});
  }

  async resumeConnectorJob(id: string): Promise<void> {
    await this.post<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/${encodeURIComponent(id)}/resume`, {});
  }

  // Fire-and-forget: 200 means "queued", not "executed". The real run happens within ~1s;
  // poll the list afterwards to observe the status transition (PENDING → RUNNING → PENDING/COMPLETED).
  async runConnectorJobNow(id: string): Promise<void> {
    await this.post<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/${encodeURIComponent(id)}/run-now`, {});
  }

  // SYSTEM tasks cannot be deleted (backend returns 400) — pause them or delete the integration.
  async deleteConnectorJob(id: string): Promise<void> {
    await this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/${encodeURIComponent(id)}`);
  }

  // Device triggers
  async getDeviceTriggers(): Promise<DeviceTriggerGroup[]> {
    return this.get<DeviceTriggerGroup[]>(`${API.ENDPOINTS.CONTROL_API}/manage/triggers/`);
  }

  // Device tools
  async getDeviceTools(): Promise<DeviceToolGroup[]> {
    return this.get<DeviceToolGroup[]>(`${API.ENDPOINTS.CONTROL_API}/manage/tools/`);
  }

  // Trigger logs
  async getTriggerLogs(params?: { connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<TriggerLog>> {
    const searchParams = new URLSearchParams();
    if (params?.connectorCode) searchParams.set('connectorCode', params.connectorCode);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<PagedResponse<TriggerLog>>(`${API.ENDPOINTS.CONTROL_API}/manage/trigger-logs/${query ? `?${query}` : ''}`);
  }

  // Trigger Log Probe — issue a probe code that captures the next matching trigger.
  async issueTriggerLogProbe(blockDelivery: boolean = true): Promise<TriggerLogProbeResponse> {
    return this.post<TriggerLogProbeResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/trigger-logs/probe`,
      { blockDelivery },
    );
  }

  // Trigger Log Probe — match. Returns null when nothing has matched yet (HTTP 404).
  async matchTriggerLogProbe(code: string, since: string): Promise<TriggerLog | null> {
    const params = new URLSearchParams({ code, since });
    try {
      return await this.get<TriggerLog>(
        `${API.ENDPOINTS.CONTROL_API}/manage/trigger-logs/probe/match?${params.toString()}`,
      );
    } catch (err) {
      // Backend returns 404 with message "No matching trigger log yet" while waiting.
      if (err instanceof ApiError && err.message === 'No matching trigger log yet') {
        return null;
      }
      throw err;
    }
  }

  // Webhook Delivery Logs
  async getWebhookDeliveryLogs(params?: { agentId?: string; page?: number; size?: number }): Promise<WebhookDeliveryLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.agentId) searchParams.set('agentId', params.agentId);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<WebhookDeliveryLogsResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webhook-deliveries/${query ? `?${query}` : ''}`
    );
  }

  // Agentic Teams
  async getAgenticTeams(): Promise<AgenticTeam[]> {
    return this.get<AgenticTeam[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/`);
  }

  async getAgenticTeam(id: string): Promise<AgenticTeam> {
    return this.get<AgenticTeam>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${id}`);
  }

  async createAgenticTeam(data: CreateAgenticTeamRequest): Promise<AgenticTeam> {
    return this.post<AgenticTeam>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/`, data);
  }

  async updateAgenticTeam(id: string, data: UpdateAgenticTeamRequest): Promise<AgenticTeam> {
    return this.put<AgenticTeam>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${id}`, data);
  }

  async deleteAgenticTeam(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agentic-teams/${id}`);
  }

  // ========== BOARDS ==========

  async getBoards(): Promise<Board[]> {
    return this.get<Board[]>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/`);
  }

  async createBoard(data: CreateBoardRequest): Promise<Board> {
    return this.post<Board>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/`, data);
  }

  async getBoard(boardId: string): Promise<Board> {
    return this.get<Board>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/${boardId}`);
  }

  async getBoardTasks(boardId: string): Promise<TasksByStatus> {
    return this.get<TasksByStatus>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/${boardId}/tasks/`);
  }

  async createBoardTask(boardId: string, data: CreateTaskRequest): Promise<BoardTask> {
    return this.post<BoardTask>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/${boardId}/tasks/`, data);
  }

  async changeTaskStatus(taskId: string, data: ChangeTaskStatusRequest): Promise<BoardTask> {
    return this.patch<BoardTask>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/tasks/${taskId}/status`, data);
  }

  async getTaskComments(taskId: string): Promise<BoardTaskComment[]> {
    return this.get<BoardTaskComment[]>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/tasks/${taskId}/comments/`);
  }

  async createTaskComment(taskId: string, data: CreateCommentRequest): Promise<BoardTaskComment> {
    return this.post<BoardTaskComment>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/tasks/${taskId}/comments/`, data);
  }

  // ========== CENTRIFUGO ==========

  async getCentrifugoToken(): Promise<CentrifugoTokenResponse> {
    return this.post<CentrifugoTokenResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/centrifugo/token`, {});
  }

  // ========== INTEGRATION CREDENTIALS ==========

  async getIntegrationCredentials(connectorCode?: string): Promise<IntegrationResponse[]> {
    const q = connectorCode ? `?connectorCode=${encodeURIComponent(connectorCode)}` : '';
    return this.get<IntegrationResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${q}`);
  }

  async getIntegrationCredential(id: string): Promise<IntegrationResponse> {
    return this.get<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}`);
  }

  async createIntegration(data: CreateIntegrationRequest): Promise<IntegrationResponse> {
    return this.post<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/`, data);
  }

  async updateIntegration(id: string, data: UpdateIntegrationRequest): Promise<IntegrationResponse> {
    return this.patch<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}/`, data);
  }

  async updateIntegrationSecret(id: string, data: UpdateIntegrationCredentialsRequest): Promise<IntegrationResponse> {
    return this.put<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}/secret`, data);
  }

  async deleteIntegration(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}`);
  }

  // Validates credentials and (for MCP) synchronously reloads the tools cache.
  async testIntegration(id: string): Promise<IntegrationTestResult> {
    return this.post<IntegrationTestResult>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}/test`, {});
  }

  // Cached tools for this MCP instance (empty for non-MCP integrations).
  async getIntegrationCredentialTools(id: string): Promise<ConnectorToolSpec[]> {
    return this.get<ConnectorToolSpec[]>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}/tools/`);
  }

  // ========== SKILLS ==========

  async getSkills(params?: { search?: string; connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<SkillResponse>> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.connectorCode) q.set('connectorCode', params.connectorCode);
    q.set('page', String(params?.page ?? 0));
    q.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<SkillResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/?${q}`);
  }

  async getPublicSkills(params?: { search?: string; connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<SkillResponse>> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.connectorCode) q.set('connectorCode', params.connectorCode);
    q.set('page', String(params?.page ?? 0));
    q.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<SkillResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/public/?${q}`);
  }

  async getSkill(id: string): Promise<SkillDetailResponse> {
    return this.get<SkillDetailResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/${id}`);
  }

  async createSkill(data: CreateSkillRequest): Promise<SkillResponse> {
    return this.post<SkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/`, data);
  }

  async updateSkill(id: string, data: UpdateSkillRequest): Promise<SkillResponse> {
    return this.put<SkillResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/${id}`, data);
  }

  async deleteSkill(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/skills/${id}`);
  }

  async getSkillAgents(
    skillId: string,
    params?: { search?: string; page?: number; size?: number }
  ): Promise<PagedResponse<AgentSummaryResponse>> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    q.set('page', String(params?.page ?? 0));
    q.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<AgentSummaryResponse>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/skills/${skillId}/agents/?${q}`
    );
  }

  // ========== CONNECTOR CATALOG ==========

  async getConnectorCatalog(): Promise<ConnectorCatalogEntry[]> {
    // Backend returns a paginated response; fetch a large page and unwrap content.
    // Tolerates legacy array responses for backwards compatibility.
    const result = await this.get<PagedResponse<ConnectorCatalogEntry> | ConnectorCatalogEntry[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/connectors/?size=200`
    );
    return Array.isArray(result) ? result : result.content;
  }

  async getConnectors(params?: {
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<ConnectorCatalogEntry>> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    q.set('page', String(params?.page ?? 0));
    q.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<ConnectorCatalogEntry>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/connectors/?${q}`
    );
  }

  async getConnector(code: string): Promise<ConnectorCatalogEntry> {
    return this.get<ConnectorCatalogEntry>(`${API.ENDPOINTS.CONTROL_API}/manage/connectors/${encodeURIComponent(code)}`);
  }

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