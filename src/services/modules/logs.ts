// modules/logs.ts
import { httpClient, buildPagedQuery, ApiError } from '../httpClient';
import { API } from '@/config/constants';
import type {
  TriggerLog,
  TriggerLogProbeResponse,
  ToolUseLogResponse,
  ToolUseLogFilters,
  PagedResponse,
  ConnectorJobResponse,
  ConnectorJobKind,
  WebhookDeliveryLog,
} from '@/types';

export const logsApi = {
  // Tool Use Logs (paginated; filters combine with AND, sorted createdAt DESC)
  async getToolUseLogs(params?: ToolUseLogFilters & { page?: number; size?: number }): Promise<PagedResponse<ToolUseLogResponse>> {
    const query = buildPagedQuery(
      {
        agentId: params?.agentId,
        connectorCode: params?.connectorCode,
        connectionId: params?.connectionId,
        name: params?.name,
        accessEffect: params?.accessEffect,
        status: params?.status,
      },
      params,
    );
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

  // SYSTEM tasks cannot be deleted (backend returns 400) — pause them or delete the connection.
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

  // Runs of a trigger moved out of this sub-resource: see `getRuns` in
  // modules/runs.ts (/manage/runs/, agentId no longer required).

  // Trigger discovery probe — issue a one-off code the user drops into a test event.
  // Default `blockDelivery: true` logs the trigger but does NOT deliver it to agents,
  // so the probe never wakes an agent. Pass `false` to also deliver (diagnose delivery).
  async issueTriggerLogProbe(blockDelivery: boolean = true): Promise<TriggerLogProbeResponse> {
    return httpClient.post<TriggerLogProbeResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/trigger-logs/probe`,
      { blockDelivery },
    );
  },

  // Poll for the trigger log carrying the probe code. `since` is the probe's `issuedAt`.
  // Returns null while nothing has matched yet (backend answers 404 "No matching trigger log yet").
  async matchTriggerLogProbe(code: string, since: string): Promise<TriggerLog | null> {
    const params = new URLSearchParams({ code, since });
    try {
      return await httpClient.get<TriggerLog>(
        `${API.ENDPOINTS.CONTROL_API}/manage/trigger-logs/probe/match?${params.toString()}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.message === 'No matching trigger log yet') {
        return null;
      }
      throw err;
    }
  },

  // Webhook Delivery Logs
  async getWebhookDeliveryLogs(params?: { agentId?: string; page?: number; size?: number }): Promise<PagedResponse<WebhookDeliveryLog>> {
    const searchParams = new URLSearchParams();
    if (params?.agentId) searchParams.set('agentId', params.agentId);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return httpClient.get<PagedResponse<WebhookDeliveryLog>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/webhook-deliveries/${query ? `?${query}` : ''}`
    );
  },
};
