// Connector types (replaces apps)

export interface ConnectorResponse {
  pubId: string;
  name: string;
  description: string;
  maskedKeyId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  features: Record<string, unknown> | null;
}

export interface ConnectorCreatedResponse {
  pubId: string;
  name: string;
  fullKey: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorDetailResponse {
  connectorId: string;
  connectorName: string;
  deviceId: string | null;
  deviceFeatures: Record<string, unknown> | null;
  connected: boolean;
  triggers: Record<string, unknown> | null;
  tools: Record<string, unknown> | null;
}

export interface CreateConnectorRequest {
  name: string;
  description?: string;
}

export interface UpdateConnectorRequest {
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

export interface DeviceToolGroup {
  connectorPubId: string;
  deviceId: string;
  deviceName: string;
  tools: DeviceToolInfo[];
}

// Trigger log entry returned by GET /device/manage/trigger-logs/
export interface TriggerLog {
  id: string;
  connectorPubId: string;
  triggerId: string;
  triggerType: string;
  triggerName: string;
  triggerSource: string;
  requestDeviceId: string;
  linkedDeviceId: string;
  occurredAt: string;
  triggerData: Record<string, unknown>;
  createdAt: string;
}
