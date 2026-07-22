// modules/connections.ts
//
// Connections are connector *instances* — `Connection` resources on the backend.
// External connectors (telegram/mcp/app) have user-created instances; internal
// connectors have one system row per user, created and managed by the backend.
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  ConnectorToolSpec,
  ConnectorJobResponse,
  ConnectionResponse,
  CreateConnectionRequest,
  TriggerSpecificationResponse,
  UpdateConnectionRequest,
  UpdateConnectionSecretRequest,
  ConnectionTestResponse,
} from '@/types';

export const connectionsApi = {
  // ========== CONNECTIONS (connector instances) ==========

  async getConnections(connectorCode?: string): Promise<ConnectionResponse[]> {
    const params = new URLSearchParams();
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

  // ---- Per-instance capabilities (source of truth for a connection card) ----
  // All three address the connection by id and return the instance's actual set.
  // A missing capability is an empty list, not an error (only a wrong/foreign
  // connection is a 404).

  // Tool *specs* the instance exposes (empty for connectors without tools).
  async getConnectionTools(id: string): Promise<ConnectorToolSpec[]> {
    return httpClient.get<ConnectorToolSpec[]>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/tools/`);
  },

  // Trigger *specs* (type-declared ∪ per-connection dynamic) the instance emits.
  async getConnectionTriggers(id: string): Promise<TriggerSpecificationResponse[]> {
    return httpClient.get<TriggerSpecificationResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/triggers/`);
  },

  // Background job *instances* scheduled/running for this connection. Runtime
  // rows (status/nextRunAt/pausedAt/lastError); manage via connector-jobs/{id}/…
  async getConnectionJobs(id: string): Promise<ConnectorJobResponse[]> {
    return httpClient.get<ConnectorJobResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/jobs/`);
  },
};
