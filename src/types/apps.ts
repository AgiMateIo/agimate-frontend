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

// Device trigger info returned by GET /control/manage/triggers/
export interface DeviceTriggerInfo {
  name: string;
  description: string;
}

export interface DeviceTriggerGroup {
  connectorId: string;
  deviceId: string;
  deviceName: string;
  triggers: DeviceTriggerInfo[];
}

// Device tool info returned by GET /control/manage/tools/
export interface DeviceToolInfo {
  name: string;
  description: string;
}

// JSON Schema node (draft 2020-12 subset, as in MCP) used by ConnectorToolSpec.
// Fields are JsonInclude.NON_NULL on the backend, so absent properties are omitted.
// An empty schema {} means "any type".
export interface ToolJsonSchema {
  type?: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
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
// GET /control/manage/tools/{connectorCode}/{toolName}, and the element type of
// GET /control/manage/tools/{connectorCode}/ and /manage/integrations/tools/.
export interface ConnectorToolSpec {
  name: string;
  title?: string;
  description?: string;
  inputSchema: ToolJsonSchema; // { type: 'object' } for tools without parameters
  outputSchema?: ToolJsonSchema;
  annotations?: ToolAnnotations;
  _meta?: Record<string, string>;
}

export interface DeviceToolGroup {
  connectorId: string;
  deviceId: string;
  deviceName: string;
  tools: DeviceToolInfo[];
}

// Trigger log entry returned by GET /control/manage/trigger-logs/
export interface TriggerLog {
  id: string;
  connectorCode: string;
  identity: string;
  triggerId: string;
  triggerName: string;
  occurredAt: string;
  triggerInput: Record<string, unknown>;
  agentsCount: number;
  createdAt: string;
}

// Response of POST /control/manage/trigger-logs/probe — issues a short-lived
// probe code that the user pastes into a real bot/app/channel to make the
// backend capture the resulting TriggerLog without delivering it to agents.
export interface TriggerLogProbeResponse {
  code: string;       // agm-probe-(block|pass)-[a-z0-9]{10}
  issuedAt: string;   // LocalDateTime ISO (yyyy-MM-dd'T'HH:mm:ss), no timezone
}
