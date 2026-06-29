// modules/integrations.ts
//
// "Integrations" in the UI are connector *instances* — `Connection` resources on
// the backend, scoped to INSTANCE (the ones a user creates and manages directly).
// Other scopes (AGENT/TEAM/USER/GLOBAL) are bindings, not surfaced here.
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  ConnectorToolSpec,
  IntegrationResponse,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  UpdateIntegrationCredentialsRequest,
  IntegrationTestResult,
  DeviceTriggerInfo,
} from '@/types';

export const integrationsApi = {
  // Trigger catalog for a connector *type* (predefined triggers).
  async getIntegrationTriggers(connectorCode: string): Promise<DeviceTriggerInfo[]> {
    return httpClient.get<DeviceTriggerInfo[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/connectors/${encodeURIComponent(connectorCode)}/triggers/`
    );
  },

  // ========== CONNECTIONS (connector instances) ==========

  async getIntegrationCredentials(connectorCode?: string): Promise<IntegrationResponse[]> {
    const params = new URLSearchParams({ scope: 'INSTANCE' });
    if (connectorCode) params.set('connectorCode', connectorCode);
    return httpClient.get<IntegrationResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/?${params}`);
  },

  async getIntegrationCredential(id: string): Promise<IntegrationResponse> {
    return httpClient.get<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}`);
  },

  async createIntegration(data: CreateIntegrationRequest): Promise<IntegrationResponse> {
    return httpClient.post<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/`, data);
  },

  async updateIntegration(id: string, data: UpdateIntegrationRequest): Promise<IntegrationResponse> {
    return httpClient.patch<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}`, data);
  },

  async updateIntegrationSecret(id: string, data: UpdateIntegrationCredentialsRequest): Promise<IntegrationResponse> {
    return httpClient.put<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/secret`, data);
  },

  async deleteIntegration(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}`);
  },

  // Validates credentials and (for MCP) synchronously reloads the tools cache.
  async testIntegration(id: string): Promise<IntegrationTestResult> {
    return httpClient.post<IntegrationTestResult>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/test`, {});
  },

  // Cached tools for this connector instance (empty for non-MCP connections).
  async getIntegrationCredentialTools(id: string): Promise<ConnectorToolSpec[]> {
    return httpClient.get<ConnectorToolSpec[]>(`${API.ENDPOINTS.CONTROL_API}/manage/connections/${id}/tools/`);
  },
};
