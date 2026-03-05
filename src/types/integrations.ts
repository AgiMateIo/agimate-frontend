export interface IntegrationPlatformInfo {
  code: string;
  name: string;
  credentialFields: string[];
  supportsWebhooks: boolean;
}

export interface IntegrationResponse {
  id: string;
  platformType: string;
  platformCode: string;
  platformName: string;
  platformIdentifier: string;
  name: string;
  connectorCode: string;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateIntegrationRequest {
  platformCode: string;
  credentials: Record<string, string>;
  name?: string;
}

export interface UpdateIntegrationRequest {
  enabled?: boolean;
  name?: string;
}

export interface UpdateIntegrationCredentialsRequest {
  credentials: Record<string, string>;
}
