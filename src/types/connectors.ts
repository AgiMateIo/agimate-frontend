// Connectors types

// Connector Info
export interface ConnectorInfo {
  id: string;  // UUID
  code: string;
  name: string;
  description: string;
  baseUrl: string;
  iconUrl: string;
  requiredCredentialFields: string[];
  hasMethodDefinitions: boolean;
}

// Credential
export interface Credential {
  id: string;  // UUID
  connectorCode: string;
  name: string;
  description: string;
  enabled: boolean;
  lastUsedAt: string | null;  // "yyyy-MM-dd HH:mm:ss"
  createdAt: string;           // "yyyy-MM-dd HH:mm:ss"
}

// Connector Summary
export interface ConnectorSummary {
  connectorCode: string;
  connectorName: string;
  credentialCount: number;
  lastAddedAt: string | null;
  lastUsedAt: string | null;
}

// ConnectorsApiKey
export interface ConnectorsApiKey {
  pubId: string;
  name: string;
  description: string;
  maskedKeyId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorsApiKeyWithSecret {
  apiKey: ConnectorsApiKey;
  fullKey: string;  // only shown once on creation/regeneration
}

// Request types
export interface CreateCredentialRequest {
  name: string;
  description?: string;
  data: Record<string, string>;  // e.g., { clientId: 'xxx', apiKey: 'yyy' }
}

export interface UpdateCredentialRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  data?: Record<string, string>;
}

export interface CreateConnectorsApiKeyRequest {
  name: string;
  description?: string;
}

export interface UpdateConnectorsApiKeyRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
}

export interface CallMethodRequest {
  credentialId: string;
  parameters: Record<string, unknown>;
}

// Method & Call Result
export interface MethodDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  parameters: MethodParameter[];
}

export interface MethodParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

export interface CallResult {
  success: boolean;
  data: unknown;
  error?: string;
  durationMs: number;
}
