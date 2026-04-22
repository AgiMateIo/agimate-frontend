export interface IntegrationResponse {
  id: string;
  connectorCode: string;
  platformIdentifier: string;
  name: string;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateIntegrationRequest {
  connectorCode: string;
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
