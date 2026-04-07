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
  DeviceTriggerGroup,
  DeviceToolGroup,
  AgentResponse,
  AgentSummaryResponse,
  AgentCreatedResponse,
  CreateAgentRequest,
  UpdateAgentRequest,
  ToolUseLogResponse,
  PagedResponse,
  WebhookDeliveryLogsResponse,
  AgenticTeam,
  CreateAgenticTeamRequest,
  UpdateAgenticTeamRequest,
  IntegrationPlatformInfo,
  IntegrationResponse,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  UpdateIntegrationCredentialsRequest,
  AgentPolicyResponse,
  CreateAgentPolicyRequest,
  UpdateAgentPolicyRequest,
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
  SkillFileEntry,
  SkillConnectorResponse,
  SkillConnectorRequest,
  ConnectorCatalogEntry,
  ConnectorType,
  AgentSkillResponse,
  CreateAgentSkillRequest,
  PolicyDiffResponse,
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
    return this.get<PagedResponse<AppResponse>>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/?${query}`);
  }

  async createApp(data: CreateAppRequest): Promise<AppCreatedResponse> {
    return this.post<AppCreatedResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/`, data);
  }

  async getApp(id: string): Promise<UserAppDetailResponse> {
    return this.get<UserAppDetailResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/apps/${id}`);
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

  // Agents
  async getAgentsList(params?: { agenticTeamPubId?: string; page?: number; size?: number }): Promise<PagedResponse<AgentResponse>> {
    const query = new URLSearchParams();
    if (params?.agenticTeamPubId) query.set('agenticTeamPubId', params.agenticTeamPubId);
    query.set('page', String(params?.page ?? 0));
    query.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<AgentResponse>>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/?${query}`);
  }

  async createAgent(data: CreateAgentRequest): Promise<AgentCreatedResponse> {
    return this.post<AgentCreatedResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/`, data);
  }

  async getAgent(id: string): Promise<AgentResponse> {
    return this.get<AgentResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${id}`);
  }

  async updateAgent(id: string, data: UpdateAgentRequest): Promise<AgentResponse> {
    return this.put<AgentResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${id}`, data);
  }

  async deleteAgent(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${id}`);
  }

  async regenerateAgentKey(id: string): Promise<AgentCreatedResponse> {
    return this.post<AgentCreatedResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${id}/regenerate`, {});
  }

  // Agent Policies (tool & trigger) — normalized to AgentPolicyResponse
  private mapPolicyPage(
    raw: PagedResponse<Record<string, unknown>>,
    resourceField: string,
  ): PagedResponse<AgentPolicyResponse> {
    return {
      ...raw,
      content: raw.content.map((p) => ({
        ...p,
        resourceName: (p[resourceField] as string | null) ?? null,
      })) as unknown as AgentPolicyResponse[],
    };
  }

  private mapPolicy(raw: Record<string, unknown>, resourceField: string): AgentPolicyResponse {
    return { ...raw, resourceName: (raw[resourceField] as string | null) ?? null } as unknown as AgentPolicyResponse;
  }

  private toRawPolicyBody(data: CreateAgentPolicyRequest | UpdateAgentPolicyRequest, resourceField: string) {
    const { resourceName, ...rest } = data as CreateAgentPolicyRequest & { resourceName?: string | null };
    return { ...rest, [resourceField]: resourceName };
  }

  // Tool policies
  async getAgentToolPolicies(params: { agentPubId: string; page?: number; size?: number }): Promise<PagedResponse<AgentPolicyResponse>> {
    const searchParams = new URLSearchParams();
    searchParams.set('agentPubId', params.agentPubId);
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 20));
    const raw = await this.get<PagedResponse<Record<string, unknown>>>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-tool-policies/?${searchParams}`);
    return this.mapPolicyPage(raw, 'toolName');
  }

  async createAgentToolPolicy(data: CreateAgentPolicyRequest): Promise<AgentPolicyResponse> {
    const raw = await this.post<Record<string, unknown>>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-tool-policies/`, this.toRawPolicyBody(data, 'toolName'));
    return this.mapPolicy(raw, 'toolName');
  }

  async updateAgentToolPolicy(id: string, data: UpdateAgentPolicyRequest): Promise<AgentPolicyResponse> {
    const raw = await this.put<Record<string, unknown>>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-tool-policies/${id}`, this.toRawPolicyBody(data, 'toolName'));
    return this.mapPolicy(raw, 'toolName');
  }

  async deleteAgentToolPolicy(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-tool-policies/${id}`);
  }

  // Trigger policies
  async getAgentTriggerPolicies(params: { agentPubId: string; page?: number; size?: number }): Promise<PagedResponse<AgentPolicyResponse>> {
    const searchParams = new URLSearchParams();
    searchParams.set('agentPubId', params.agentPubId);
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 20));
    const raw = await this.get<PagedResponse<Record<string, unknown>>>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-trigger-policies/?${searchParams}`);
    return this.mapPolicyPage(raw, 'triggerName');
  }

  async createAgentTriggerPolicy(data: CreateAgentPolicyRequest): Promise<AgentPolicyResponse> {
    const raw = await this.post<Record<string, unknown>>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-trigger-policies/`, this.toRawPolicyBody(data, 'triggerName'));
    return this.mapPolicy(raw, 'triggerName');
  }

  async updateAgentTriggerPolicy(id: string, data: UpdateAgentPolicyRequest): Promise<AgentPolicyResponse> {
    const raw = await this.put<Record<string, unknown>>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-trigger-policies/${id}`, this.toRawPolicyBody(data, 'triggerName'));
    return this.mapPolicy(raw, 'triggerName');
  }

  async deleteAgentTriggerPolicy(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/agent-trigger-policies/${id}`);
  }

  // Agent-Skill bindings
  async getAgentSkills(params: { agentPubId: string; page?: number; size?: number }): Promise<PagedResponse<AgentSkillResponse>> {
    const q = new URLSearchParams();
    q.set('page', String(params.page ?? 0));
    q.set('size', String(params.size ?? 20));
    return this.get<PagedResponse<AgentSkillResponse>>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${params.agentPubId}/skills/?${q}`);
  }

  async bindAgentSkill(agentPubId: string, data: CreateAgentSkillRequest): Promise<AgentSkillResponse> {
    return this.post<AgentSkillResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${agentPubId}/skills/`, data);
  }

  async unbindAgentSkill(agentPubId: string, skillPubId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${agentPubId}/skills/${skillPubId}`);
  }

  async getSkillPolicyDiff(agentPubId: string, skillPubId: string, action: 'add' | 'remove' | 'sync'): Promise<PolicyDiffResponse> {
    const q = new URLSearchParams();
    q.set('action', action);
    return this.get<PolicyDiffResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${agentPubId}/skills/${skillPubId}/policy-diff?${q}`);
  }

  async syncAgentSkillPolicies(agentPubId: string): Promise<void> {
    return this.post<void>(`${API.ENDPOINTS.DEVICE_API}/manage/agents/${agentPubId}/skills/sync-policies`, {});
  }

  // App resources
  async getAppTools(appPubId: string): Promise<DeviceToolInfo[]> {
    return this.get<DeviceToolInfo[]>(`${API.ENDPOINTS.DEVICE_API}/manage/app-tools/${appPubId}`);
  }

  async getAppTriggers(appPubId: string): Promise<DeviceTriggerInfo[]> {
    return this.get<DeviceTriggerInfo[]>(`${API.ENDPOINTS.DEVICE_API}/manage/app-triggers/${appPubId}`);
  }

  // Tool Use Logs (paginated)
  async getToolUseLogs(params?: { agentPubId?: string; page?: number; size?: number }): Promise<PagedResponse<ToolUseLogResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.agentPubId) searchParams.set('agentPubId', params.agentPubId);
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
  async getTriggerLogs(params?: { connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<TriggerLog>> {
    const searchParams = new URLSearchParams();
    if (params?.connectorCode) searchParams.set('connectorCode', params.connectorCode);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<PagedResponse<TriggerLog>>(`${API.ENDPOINTS.DEVICE_API}/manage/trigger-logs/${query ? `?${query}` : ''}`);
  }

  // Webhook Delivery Logs
  async getWebhookDeliveryLogs(params?: { agentPubId?: string; page?: number; size?: number }): Promise<WebhookDeliveryLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.agentPubId) searchParams.set('agentPubId', params.agentPubId);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<WebhookDeliveryLogsResponse>(
      `${API.ENDPOINTS.DEVICE_API}/manage/webhook-deliveries/${query ? `?${query}` : ''}`
    );
  }

  // Agentic Teams
  async getAgenticTeams(): Promise<AgenticTeam[]> {
    return this.get<AgenticTeam[]>(`${API.ENDPOINTS.DEVICE_API}/manage/agentic-teams/`);
  }

  async getAgenticTeam(id: string): Promise<AgenticTeam> {
    return this.get<AgenticTeam>(`${API.ENDPOINTS.DEVICE_API}/manage/agentic-teams/${id}`);
  }

  async createAgenticTeam(data: CreateAgenticTeamRequest): Promise<AgenticTeam> {
    return this.post<AgenticTeam>(`${API.ENDPOINTS.DEVICE_API}/manage/agentic-teams/`, data);
  }

  async updateAgenticTeam(id: string, data: UpdateAgenticTeamRequest): Promise<AgenticTeam> {
    return this.put<AgenticTeam>(`${API.ENDPOINTS.DEVICE_API}/manage/agentic-teams/${id}`, data);
  }

  async deleteAgenticTeam(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/agentic-teams/${id}`);
  }

  // ========== BOARDS ==========

  async getBoards(): Promise<Board[]> {
    return this.get<Board[]>(`${API.ENDPOINTS.DEVICE_API}/manage/boards/`);
  }

  async createBoard(data: CreateBoardRequest): Promise<Board> {
    return this.post<Board>(`${API.ENDPOINTS.DEVICE_API}/manage/boards/`, data);
  }

  async getBoard(boardPubId: string): Promise<Board> {
    return this.get<Board>(`${API.ENDPOINTS.DEVICE_API}/manage/boards/${boardPubId}`);
  }

  async getBoardTasks(boardPubId: string): Promise<TasksByStatus> {
    return this.get<TasksByStatus>(`${API.ENDPOINTS.DEVICE_API}/manage/boards/${boardPubId}/tasks/`);
  }

  async createBoardTask(boardPubId: string, data: CreateTaskRequest): Promise<BoardTask> {
    return this.post<BoardTask>(`${API.ENDPOINTS.DEVICE_API}/manage/boards/${boardPubId}/tasks/`, data);
  }

  async changeTaskStatus(taskPubId: string, data: ChangeTaskStatusRequest): Promise<BoardTask> {
    return this.patch<BoardTask>(`${API.ENDPOINTS.DEVICE_API}/manage/boards/tasks/${taskPubId}/status`, data);
  }

  async getTaskComments(taskPubId: string): Promise<BoardTaskComment[]> {
    return this.get<BoardTaskComment[]>(`${API.ENDPOINTS.DEVICE_API}/manage/boards/tasks/${taskPubId}/comments/`);
  }

  async createTaskComment(taskPubId: string, data: CreateCommentRequest): Promise<BoardTaskComment> {
    return this.post<BoardTaskComment>(`${API.ENDPOINTS.DEVICE_API}/manage/boards/tasks/${taskPubId}/comments/`, data);
  }

  // ========== PLATFORM INTEGRATIONS ==========

  async getPlatforms(): Promise<IntegrationPlatformInfo[]> {
    return this.get<IntegrationPlatformInfo[]>(`${API.ENDPOINTS.DEVICE_API}/manage/integrations/platforms/`);
  }

  async getIntegrations(): Promise<IntegrationResponse[]> {
    return this.get<IntegrationResponse[]>(`${API.ENDPOINTS.DEVICE_API}/manage/integrations/`);
  }

  async getIntegration(id: string): Promise<IntegrationResponse> {
    return this.get<IntegrationResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/integrations/${id}`);
  }

  async createIntegration(data: CreateIntegrationRequest): Promise<IntegrationResponse> {
    return this.post<IntegrationResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/integrations/`, data);
  }

  async updateIntegration(id: string, data: UpdateIntegrationRequest): Promise<IntegrationResponse> {
    return this.patch<IntegrationResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/integrations/${id}`, data);
  }

  async updateIntegrationCredentials(id: string, data: UpdateIntegrationCredentialsRequest): Promise<IntegrationResponse> {
    return this.put<IntegrationResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/integrations/${id}/credentials`, data);
  }

  async deleteIntegration(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/integrations/${id}`);
  }

  // ========== SKILLS ==========

  async getSkills(params?: { search?: string; connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<SkillResponse>> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.connectorCode) q.set('connectorCode', params.connectorCode);
    q.set('page', String(params?.page ?? 0));
    q.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<SkillResponse>>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/?${q}`);
  }

  async getPublicSkills(params?: { search?: string; connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<SkillResponse>> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.connectorCode) q.set('connectorCode', params.connectorCode);
    q.set('page', String(params?.page ?? 0));
    q.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<SkillResponse>>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/public/?${q}`);
  }

  async getFeaturedSkills(params?: { search?: string; connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<SkillResponse>> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.connectorCode) q.set('connectorCode', params.connectorCode);
    q.set('page', String(params?.page ?? 0));
    q.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<SkillResponse>>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/featured/?${q}`);
  }

  async getSkill(id: string): Promise<SkillDetailResponse> {
    return this.get<SkillDetailResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/${id}`);
  }

  async createSkill(data: CreateSkillRequest): Promise<SkillResponse> {
    return this.post<SkillResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/`, data);
  }

  async updateSkill(id: string, data: UpdateSkillRequest): Promise<SkillResponse> {
    return this.put<SkillResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/${id}`, data);
  }

  async deleteSkill(id: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/${id}`);
  }

  async cloneSkill(id: string): Promise<SkillResponse> {
    return this.post<SkillResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/${id}/clone`, {});
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
      `${API.ENDPOINTS.DEVICE_API}/manage/skills/${skillId}/agents/?${q}`
    );
  }

  async getSkillFiles(skillId: string): Promise<SkillFileEntry[]> {
    return this.get<SkillFileEntry[]>(`${API.ENDPOINTS.DEVICE_API}/manage/skill-files/${skillId}/`);
  }

  async uploadSkillFile(skillId: string, formData: FormData): Promise<void> {
    return this.postFormData<void>(`${API.ENDPOINTS.DEVICE_API}/manage/skill-files/${skillId}/`, formData);
  }

  async deleteSkillFile(skillId: string, filePath: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/skill-files/${skillId}/${filePath}`);
  }

  async downloadSkillFile(skillId: string, filePath: string): Promise<Blob> {
    const url = `${getApiBaseUrl()}${API.ENDPOINTS.DEVICE_API}/manage/skill-files/${skillId}/${filePath}`;
    const token = getAccessToken();
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    let response = await safeFetch(url, { headers });

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const newToken = getAccessToken();
        const retryHeaders: HeadersInit = {
          ...(newToken && { Authorization: `Bearer ${newToken}` }),
        };
        response = await safeFetch(url, { headers: retryHeaders });
      }
      if (response.status === 401) {
        throw new Error(ACCESS_DENIED_MESSAGE);
      }
    }

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    return response.blob();
  }

  // ========== SKILL CONNECTORS ==========

  async getSkillConnectors(skillId: string): Promise<SkillConnectorResponse[]> {
    return this.get<SkillConnectorResponse[]>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/${skillId}/connectors/`);
  }

  async replaceSkillConnectors(skillId: string, connectors: SkillConnectorRequest[]): Promise<SkillConnectorResponse[]> {
    return this.put<SkillConnectorResponse[]>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/${skillId}/connectors/`, { connectors });
  }

  async addSkillConnector(skillId: string, data: SkillConnectorRequest): Promise<SkillConnectorResponse> {
    return this.post<SkillConnectorResponse>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/${skillId}/connectors/`, data);
  }

  async deleteSkillConnector(skillId: string, bindingId: string): Promise<void> {
    return this.delete<void>(`${API.ENDPOINTS.DEVICE_API}/manage/skills/${skillId}/connectors/${bindingId}`);
  }

  // ========== CONNECTOR CATALOG ==========

  async getConnectorCatalog(): Promise<ConnectorCatalogEntry[]> {
    // Backend returns a paginated response; fetch a large page and unwrap content.
    // Tolerates legacy array responses for backwards compatibility.
    const result = await this.get<PagedResponse<ConnectorCatalogEntry> | ConnectorCatalogEntry[]>(
      `${API.ENDPOINTS.DEVICE_API}/manage/connectors/?size=200`
    );
    return Array.isArray(result) ? result : result.content;
  }

  async getConnectors(params?: {
    type?: ConnectorType;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<ConnectorCatalogEntry>> {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.search) q.set('search', params.search);
    q.set('page', String(params?.page ?? 0));
    q.set('size', String(params?.size ?? 20));
    return this.get<PagedResponse<ConnectorCatalogEntry>>(
      `${API.ENDPOINTS.DEVICE_API}/manage/connectors/?${q}`
    );
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