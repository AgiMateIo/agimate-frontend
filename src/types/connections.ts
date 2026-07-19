import type { IdentityScope } from './skills';

// A connector *instance* (Connection on the backend) — e.g. a specific Telegram
// bot or MCP server. Listed in the UI under "Connections" when INSTANCE-scoped.
export interface ConnectionResponse {
  id: string;
  connectorCode: string;
  // canonical instance discriminator on the platform (telegram username, MCP URL).
  // Formerly `platformIdentifier`. null until the platform identity is known.
  subCode: string | null;
  // stable per-user instance handle, e.g. `mcp_context7` — used as the instance label in UI.
  fullCode: string;
  scope: IdentityScope;
  name: string;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateConnectionRequest {
  connectorCode: string;
  credentials: Record<string, string>;
  name?: string;
}

export interface UpdateConnectionRequest {
  enabled?: boolean;
  name?: string;
}

export interface UpdateConnectionSecretRequest {
  credentials: Record<string, string>;
}

// Result of POST /manage/connections/{id}/test
export interface ConnectionTestResponse {
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

// A trigger *spec* (declaration) for a connection instance, returned by
// GET /manage/connections/{id}/triggers/. The instance set is the union of the
// connector type's declared triggers and any per-connection dynamic ones.
export interface TriggerSpecificationResponse {
  name: string;
  description: string;
  // Parameter names carried in `trigger.data`; best-effort for dynamic
  // triggers, so it may be empty.
  params: string[];
}
