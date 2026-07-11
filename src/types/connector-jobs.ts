// Connector task types (scheduled background invocations of connector tools)

export type ConnectorJobKind = 'SYSTEM' | 'USER' | 'AGENT';

export type ConnectorJobType = 'PERIODIC' | 'CRON' | 'ONETIME';

export type ConnectorJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED';

export interface ConnectorJobResponse {
  id: string;
  kind: ConnectorJobKind;
  connectorCode: string;
  connectionId: string | null;
  agentId: string | null;
  name: string;
  type: ConnectorJobType;
  // PERIODIC: { intervalSeconds }; CRON: { cron, zone }; ONETIME: empty or connector-specific
  config: Record<string, unknown> | null;
  args: Record<string, unknown> | null;
  status: ConnectorJobStatus;
  nextRunAt: string | null;
  pausedAt: string | null;
  lastError: string | null;
  createdAt: string;
}
