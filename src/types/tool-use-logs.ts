// Tool use log types

export interface ToolUseLogResponse {
  id: string;
  apiKeyPubId: string;
  connectorPubId: string;
  toolUseId: string;
  toolName: string;
  toolParams: Record<string, unknown>;
  resultAt: string | null;
  result: string | null;
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
