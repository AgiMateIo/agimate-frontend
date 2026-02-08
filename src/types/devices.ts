// Devices types

// Connected device returned by GET /device/manage/devices/
export interface ConnectedDevice {
  connectionId: string;
  connectionName: string;
  deviceId: string | null;
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
