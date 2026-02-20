// Apps types (replaces device auth keys)

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

export interface AppDetailResponse {
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
  deviceAuthKeyId: string;
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
  deviceAuthKeyId: string;
  deviceId: string;
  deviceName: string;
  tools: DeviceToolInfo[];
}

// Trigger log entry returned by GET /device/manage/trigger-logs/
export interface TriggerLog {
  id: string;
  appPubId: string;
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
