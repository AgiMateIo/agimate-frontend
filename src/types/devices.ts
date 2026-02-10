// Devices types

// Connected device returned by GET /device/manage/devices/
export interface ConnectedDevice {
  deviceAuthKeyId: string;
  deviceAuthKeyName: string;
  linkedDeviceId: string | null;
  deviceName: string | null;
  deviceOs: string | null;
  connected: boolean;
}

// Response при создании (показывает полный ключ только один раз)
export interface DeviceAuthKeyCreatedResponse {
  id: string;  // UUID
  name: string;
  key: string;  // Полный ключ - только при создании
  description: string;
  createdAt: string;  // LocalDateTime в формате "yyyy-MM-dd HH:mm:ss"
}

// Response в списке и при GET
export interface DeviceAuthKeyResponse {
  id: string;  // UUID
  name: string;
  description: string;
  maskedKeyId: string;  // Маскированный ключ (amobXXXX****)
  enabled: boolean;
  createdAt: string;  // LocalDateTime в формате "yyyy-MM-dd HH:mm:ss"
}

// Request для создания
export interface CreateDeviceAuthKeyRequest {
  name: string;  // max 100
  description?: string;  // max 500
}

// Request для обновления
export interface UpdateDeviceAuthKeyRequest {
  name?: string;  // max 100
  description?: string;  // max 500
  enabled?: boolean;
}

// Trigger/action entry: key is the type string, value has params list
export interface DeviceCapabilityEntry {
  params: string[];
}

// Device detail returned by GET /device/manage/devices/{deviceId}
export interface DeviceDetail {
  deviceId: string;
  deviceAuthKeyId: string;
  deviceAuthKeyName: string;
  deviceName: string | null;
  deviceOs: string | null;
  connected: boolean;
  triggers: Record<string, DeviceCapabilityEntry> | null;
  actions: Record<string, DeviceCapabilityEntry> | null;
}

// Trigger log entry returned by GET /device/manage/trigger-logs/
export interface TriggerLog {
  id: string;
  deviceAuthKeyId: string;
  triggerId: string;
  triggerType: string;
  triggerName: string;
  triggerSource: string;
  requestDeviceId: string;
  linkedDeviceId: string;
  occurredAt: string;       // ISO format "yyyy-MM-ddTHH:mm:ss"
  triggerData: Record<string, unknown>;
  createdAt: string;         // ISO format "yyyy-MM-ddTHH:mm:ss"
}
