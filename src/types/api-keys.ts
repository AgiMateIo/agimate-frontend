// API Key types

export interface ApiKey {
  id: string;
  name: string;
  description: string;
  maskedKeyId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyWithSecret {
  apiKey: ApiKey;
  fullKey: string;  // only shown once on creation/regeneration
}

export interface CreateApiKeyRequest {
  name: string;
  description?: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
}
