// Connector task types (scheduled background invocations of connector tools)

export type ConnectorTaskKind = 'SYSTEM' | 'USER' | 'AGENT';

export type ConnectorTaskType = 'PERIODIC' | 'CRON' | 'ONETIME';

export type ConnectorTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED';

export interface ConnectorTaskResponse {
  id: string;
  kind: ConnectorTaskKind;
  connectorCode: string;
  identity: string | null;
  agentId: string | null;
  taskName: string;
  taskType: ConnectorTaskType;
  // PERIODIC: { intervalSeconds }; CRON: { cron, zone }; ONETIME: empty or connector-specific
  taskConfig: Record<string, unknown> | null;
  taskArgs: Record<string, unknown> | null;
  status: ConnectorTaskStatus;
  nextRunAt: string | null;
  pausedAt: string | null;
  lastError: string | null;
  createdAt: string;
}
