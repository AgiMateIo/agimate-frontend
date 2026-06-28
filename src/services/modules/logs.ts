// modules/logs.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  TriggerLog,
  ToolUseLogResponse,
  PagedResponse,
  ConnectorJobResponse,
  ConnectorJobKind,
  WebhookDeliveryLogsResponse,
} from '@/types';

export const logsApi = {
  // Tool Use Logs (paginated)
  async getToolUseLogs(params?: { agentId?: string; page?: number; size?: number }): Promise<PagedResponse<ToolUseLogResponse>> {
    const query = buildPagedQuery({ agentId: params?.agentId }, params);
    return httpClient.get<PagedResponse<ToolUseLogResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/tool-call-logs/?${query}`);
  },

  // Connector tasks (paginated, sorted by nextRunAt ascending on the backend)
  async getConnectorJobs(params?: { connectorCode?: string; kind?: ConnectorJobKind; page?: number; size?: number }): Promise<PagedResponse<ConnectorJobResponse>> {
    const query = buildPagedQuery({ connectorCode: params?.connectorCode, kind: params?.kind }, params);
    return httpClient.get<PagedResponse<ConnectorJobResponse>>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/?${query}`);
  },

  async pauseConnectorJob(id: string): Promise<void> {
    await httpClient.post<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/${encodeURIComponent(id)}/pause`, {});
  },

  async resumeConnectorJob(id: string): Promise<void> {
    await httpClient.post<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/${encodeURIComponent(id)}/resume`, {});
  },

  // Fire-and-forget: 200 means "queued", not "executed". The real run happens within ~1s;
  // poll the list afterwards to observe the status transition (PENDING → RUNNING → PENDING/COMPLETED).
  async runConnectorJobNow(id: string): Promise<void> {
    await httpClient.post<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/${encodeURIComponent(id)}/run-now`, {});
  },

  // SYSTEM tasks cannot be deleted (backend returns 400) — pause them or delete the integration.
  async deleteConnectorJob(id: string): Promise<void> {
    await httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/connector-jobs/${encodeURIComponent(id)}`);
  },

  // Trigger logs
  async getTriggerLogs(params?: { connectorCode?: string; page?: number; size?: number }): Promise<PagedResponse<TriggerLog>> {
    const searchParams = new URLSearchParams();
    if (params?.connectorCode) searchParams.set('connectorCode', params.connectorCode);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return httpClient.get<PagedResponse<TriggerLog>>(`${API.ENDPOINTS.CONTROL_API}/manage/trigger-logs/${query ? `?${query}` : ''}`);
  },

  // Webhook Delivery Logs
  async getWebhookDeliveryLogs(params?: { agentId?: string; page?: number; size?: number }): Promise<WebhookDeliveryLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.agentId) searchParams.set('agentId', params.agentId);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return httpClient.get<WebhookDeliveryLogsResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webhook-deliveries/${query ? `?${query}` : ''}`
    );
  },
};
