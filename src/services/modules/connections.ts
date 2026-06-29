// modules/connections.ts
//
// Connections are connector *instances* — `Connection` resources on the backend.
// The UI surfaces INSTANCE-scoped connections as "integrations" (the ones a user
// creates and manages directly); other scopes (AGENT/TEAM/USER/GLOBAL) are
// bindings and not listed here.
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  ConnectorToolSpec,
  ConnectionResponse,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  UpdateConnectionSecretRequest,
  ConnectionTestResponse,
} from '@/types';

export const connectionsApi = {
  // ========== CONNECTIONS (connector instances) ==========

  async getConnections(connectorCode?: string): Promise<ConnectionResponse[]> {
    const params = new URLSearchParams({ scope: 'INSTANCE' });
    if (connectorCode) params.set('connectorCode', connectorCode);
    return httpClient.get<ConnectionResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/?${params}`);
  },

  async getConnection(id: string): Promise<ConnectionResponse> {
    return httpClient.get<ConnectionResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}`);
  },

  async createConnection(data: CreateConnectionRequest): Promise<ConnectionResponse> {
    return httpClient.post<ConnectionResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/`, data);
  },

  async updateConnection(id: string, data: UpdateConnectionRequest): Promise<ConnectionResponse> {
    return httpClient.patch<ConnectionResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}`, data);
  },

  async updateConnectionSecret(id: string, data: UpdateConnectionSecretRequest): Promise<ConnectionResponse> {
    return httpClient.put<ConnectionResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/secret`, data);
  },

  async deleteConnection(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}`);
  },

  // Validates credentials and (for MCP) synchronously reloads the tools cache.
  async testConnection(id: string): Promise<ConnectionTestResponse> {
    return httpClient.post<ConnectionTestResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/test`, {});
  },

  // Cached tools for this connector instance (empty for non-MCP connections).
  async getConnectionTools(id: string): Promise<ConnectorToolSpec[]> {
    return httpClient.get<ConnectorToolSpec[]>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/tools/`);
  },
};
