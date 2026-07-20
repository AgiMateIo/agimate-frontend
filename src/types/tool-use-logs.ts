// Tool use log types

export type ToolCallStatus = 'SUCCESS' | 'ERROR' | 'PENDING';

export interface ToolUseLogResponse {
  id: string;
  agentId: string;
  connectorCode: string | null;
  connectionId: string | null;
  agentSessionId: string | null;
  externalId: string;
  name: string;
  input: Record<string, unknown> | null;
  accessEffect: 'ALLOW' | 'DENY' | null;
  finishAt: string | null;
  output: string | null;
  error: string | null;
  createdAt: string;
}

export interface ToolUseLogFilters {
  agentId?: string;
  connectorCode?: string;
  connectionId?: string;
  // case-insensitive substring match on the tool name
  name?: string;
  accessEffect?: 'ALLOW' | 'DENY';
  // derived on the backend from finishAt/error; DENY rows match none of these
  status?: ToolCallStatus;
}
