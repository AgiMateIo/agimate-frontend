// modules/mcpOauth.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  McpAuthorizationParams,
  McpAuthorizeCheckResponse,
  McpAuthorizeRedirect,
  McpClientResponse,
} from '@/types';

const BASE = `${API.ENDPOINTS.CONTROL_API}/manage/mcp-oauth/authorize`;

export const mcpOauthApi = {
  // Consent screen of an external MCP client. Every call carries the client's
  // query as it arrived; the redirect URLs come back finished and are followed
  // as is.
  async checkMcpAuthorization(params: McpAuthorizationParams): Promise<McpAuthorizeCheckResponse> {
    return httpClient.post<McpAuthorizeCheckResponse>(`${BASE}/check`, params);
  },

  async approveMcpAuthorization(authorization: McpAuthorizationParams, agentId: string): Promise<McpAuthorizeRedirect> {
    return httpClient.post<McpAuthorizeRedirect>(`${BASE}/approve`, { authorization, agentId });
  },

  async denyMcpAuthorization(params: McpAuthorizationParams): Promise<McpAuthorizeRedirect> {
    return httpClient.post<McpAuthorizeRedirect>(`${BASE}/deny`, params);
  },

  // Clients connected to an agent by link, newest first.
  async getAgentMcpClients(agentId: string): Promise<McpClientResponse[]> {
    return httpClient.get<McpClientResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/mcp-clients/`);
  },

  async deleteAgentMcpClient(agentId: string, id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/agents/${agentId}/mcp-clients/${id}`);
  },
};
