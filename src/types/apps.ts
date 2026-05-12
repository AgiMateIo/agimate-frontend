// App types (replaces connectors)

export interface AppResponse {
  pubId: string;
  name: string;
  description: string;
  maskedKeyId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  features: Record<string, unknown> | null;
}

export interface AppCreatedResponse {
  pubId: string;
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

// Device trigger info returned by GET /device/manage/triggers/
export interface DeviceTriggerInfo {
  name: string;
  description: string;
}

export interface DeviceTriggerGroup {
  connectorPubId: string;
  deviceId: string;
  deviceName: string;
  triggers: DeviceTriggerInfo[];
}

// Device tool info returned by GET /device/manage/tools/
export interface DeviceToolInfo {
  name: string;
  description: string;
}

// JSON Schema fragment returned by GET /device/manage/tools/{connectorCode}/...
// Fields are JsonInclude.NON_NULL on the backend, so absent properties are omitted.
export interface ToolJsonSchema {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  properties?: Record<string, ToolJsonSchema>;
  required?: string[];
  items?: ToolJsonSchema;
  enumValues?: string[];
}

// Full tool specification: GET /device/manage/tools/{connectorCode}/{toolName}
export interface ToolSpecification {
  name: string;
  description: string;
  parameters: ToolJsonSchema; // root is always { type: 'object', properties, required }
}

export interface DeviceToolGroup {
  connectorPubId: string;
  deviceId: string;
  deviceName: string;
  tools: DeviceToolInfo[];
}

// Trigger log entry returned by GET /device/manage/trigger-logs/
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

// Response of POST /device/manage/trigger-logs/probe — issues a short-lived
// probe code that the user pastes into a real bot/app/channel to make the
// backend capture the resulting TriggerLog without delivering it to agents.
export interface TriggerLogProbeResponse {
  code: string;       // agm-probe-(block|pass)-[a-z0-9]{10}
  issuedAt: string;   // LocalDateTime ISO (yyyy-MM-dd'T'HH:mm:ss), no timezone
}
