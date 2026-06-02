// Tool use log types

export interface ToolUseLogResponse {
  id: string;
  agentId: string;
  connectorCode: string;
  identity: string;
  agentSessionId: string;
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  accessEffect: 'ALLOW' | 'DENY';
  outputAt: string | null;
  output: string | null;
  error: string | null;
  createdAt: string;
}

// Paginated response from GET /device/manage/tool-use-logs/
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
}
