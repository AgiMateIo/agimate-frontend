import type { IdentityScope } from './skills';

export interface IntegrationResponse {
  id: string;
  connectorCode: string;
  // canonical instance discriminator on the platform (telegram username, MCP URL).
  // Formerly `platformIdentifier`.
  subCode: string;
  // stable per-user instance handle, e.g. `mcp_context7` — used as the instance label in UI.
  fullCode: string;
  scope: IdentityScope;
  name: string;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateIntegrationRequest {
  connectorCode: string;
  credentials: Record<string, string>;
  name?: string;
}

export interface UpdateIntegrationRequest {
  enabled?: boolean;
  name?: string;
}

export interface UpdateIntegrationCredentialsRequest {
  credentials: Record<string, string>;
}

// Result of POST /manage/connections/{id}/test
export interface IntegrationTestResult {
  valid: boolean;
  identifier: string | null;
  displayName: string | null;
  // number of tools loaded into cache (MCP only; null for other connectors)
  toolsDiscovered: number | null;
  // valid:true but tools/list failed — error text; otherwise null
  toolsError: string | null;
  // populated when valid:false
  errorMessage?: string | null;
  errorField?: string | null;
}
