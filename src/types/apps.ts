// App types (replaces connectors)

export interface AppResponse {
  id: string;
  name: string;
  description: string;
  maskedKeyId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  features: Record<string, unknown> | null;
}

export interface AppCreatedResponse {
  id: string;
  name: string;
  fullKey: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAppDetailResponse {
  appId: string;
  appName: string;
  deviceId: string | null;
  deviceFeatures: Record<string, unknown> | null;
  connected: boolean;
  triggers: Record<string, unknown> | null;
  tools: Record<string, unknown> | null;
}

export interface CreateAppRequest {
  name: string;
  description?: string;
  connectorCode: string;
}

export interface UpdateAppRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
}

// Trigger catalog entry returned by GET /control/manage/connectors/{code}/triggers/
export interface TriggerInfo {
  name: string;
  description: string;
}

// JSON Schema node (draft 2020-12 subset, as in MCP) used by ConnectorToolSpec.
// Fields are JsonInclude.NON_NULL on the backend, so absent properties are omitted.
// An empty schema {} means "any type".
export interface ToolJsonSchema {
  type?: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  properties?: Record<string, ToolJsonSchema>;
  required?: string[];
  items?: ToolJsonSchema;
  enum?: Array<string | number | boolean>;
  additionalProperties?: boolean | ToolJsonSchema;
}

// MCP behavior hints. When the whole object is absent the backend defaults are:
// readOnly=false, destructive=true, idempotent=false, openWorld=true.
export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

// MCP-compatible tool spec (replaces the old ToolSpecification with `parameters`):
// element type of the connector-type tool catalog GET /control/manage/connectors/{code}/tools/
// (and GET .../{toolName} for a single schema), and of the instance tools
// GET /control/manage/connections/{connectionId}/tools/.
export interface ConnectorToolSpec {
  name: string;
  title?: string;
  description?: string;
  inputSchema: ToolJsonSchema; // { type: 'object' } for tools without parameters
  outputSchema?: ToolJsonSchema;
  annotations?: ToolAnnotations;
  _meta?: Record<string, string>;
}

// Trigger log entry returned by GET /control/manage/trigger-logs/
export interface TriggerLog {
  id: string;
  connectorCode: string;
  connectionId: string;
  externalId: string;
  name: string;
  occurredAt: string;
  input: Record<string, unknown>;
  agentsCount: number;
  createdAt: string;
}

// Runs of a trigger live in ./runs — they are addressed by /manage/runs/ now,
// not by the trigger-logs sub-resource they were born in.

// Trigger discovery probe: a one-off code the user drops into a test event so the
// frontend can confirm the "external event → connector → trigger_log" chain works.
// Returned by POST /control/manage/trigger-logs/probe. Not persisted server-side —
// the frontend keeps `code` + `issuedAt` and polls /probe/match until it surfaces.
export interface TriggerLogProbeResponse {
  code: string;     // agm-probe-(block|pass)-[a-z0-9]{10}
  issuedAt: string; // LocalDateTime ISO (yyyy-MM-dd'T'HH:mm:ss), no timezone
}
