// modules/integrations.ts
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
  // Integration resources
  async getIntegrationTriggers(connectorCode: string): Promise<DeviceTriggerInfo[]> {
    return httpClient.get<DeviceTriggerInfo[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/integrations/triggers/?connectorCode=${encodeURIComponent(connectorCode)}`
    );
  },

  // ========== INTEGRATION CREDENTIALS ==========

  async getIntegrationCredentials(connectorCode?: string): Promise<IntegrationResponse[]> {
    const q = connectorCode ? `?connectorCode=${encodeURIComponent(connectorCode)}` : '';
    return httpClient.get<IntegrationResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${q}`);
  },

  async getIntegrationCredential(id: string): Promise<IntegrationResponse> {
    return httpClient.get<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}`);
  },

  async createIntegration(data: CreateIntegrationRequest): Promise<IntegrationResponse> {
    return httpClient.post<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/`, data);
  },

  async updateIntegration(id: string, data: UpdateIntegrationRequest): Promise<IntegrationResponse> {
    return httpClient.patch<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}/`, data);
  },

  async updateIntegrationSecret(id: string, data: UpdateIntegrationCredentialsRequest): Promise<IntegrationResponse> {
    return httpClient.put<IntegrationResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}/secret`, data);
  },

  async deleteIntegration(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}`);
  },

  // Validates credentials and (for MCP) synchronously reloads the tools cache.
  async testIntegration(id: string): Promise<IntegrationTestResult> {
    return httpClient.post<IntegrationTestResult>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}/test`, {});
  },

  // Cached tools for this MCP instance (empty for non-MCP integrations).
  async getIntegrationCredentialTools(id: string): Promise<ConnectorToolSpec[]> {
    return httpClient.get<ConnectorToolSpec[]>(`${API.ENDPOINTS.CONTROL_API}/manage/integrations/credentials/${id}/tools/`);
  },
};
