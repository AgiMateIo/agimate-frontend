// Skill types

export interface SkillResponse {
  id: string;
  name: string;
  description: string | null;
  version: number;
  isPublic: boolean;
  isFeatured: boolean;
  userId: string;
  parentId: string | null;
  myCopyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDetailResponse extends SkillResponse {
  skillMd: string;
}

export interface CreateSkillRequest {
  skillMd: string;
  isPublic?: boolean;
}

export interface UpdateSkillRequest {
  skillMd: string;
  isPublic?: boolean;
}

export interface SkillFileEntry {
  path: string;
  name: string;
  size: number;
  directory: boolean;
}

// Skill connector bindings

export type SkillConnectorType = 'TOOL' | 'TRIGGER';

export interface SkillConnectorResponse {
  id: string;
  connectorCode: string;
  type: SkillConnectorType | null;
  name: string | null;
}

export interface SkillConnectorRequest {
  connectorCode: string;
  type?: SkillConnectorType | null;
  name?: string | null;
}

// Connector catalog entry (from GET /control/manage/connectors/)

export interface IntegrationMeta {
  // field code → human-readable label (keys are sent as credential codes)
  credentialFields: Record<string, string>;
  supportsWebhooks: boolean;
}

// who initiates the connection: we connect to the platform (OUTBOUND) vs device connects to us (INBOUND)
export type TransportDirection = 'OUTBOUND' | 'INBOUND';
// where a tool physically runs
export type ExecutionLocus = 'BACKEND' | 'EXTERNAL' | 'AGENT';
// fixed tool set (STATIC) vs per-instance discovered tools (DYNAMIC)
export type ToolBinding = 'STATIC' | 'DYNAMIC';
// under which key a connector instance lives. INSTANCE = explicit user-created instance
// (telegram/mcp/app); AGENT/TEAM/USER/GLOBAL = contextual instances materialised on binding.
export type IdentityScope = 'INSTANCE' | 'AGENT' | 'TEAM' | 'USER' | 'GLOBAL';

export interface ConnectorCapabilities {
  transportDirection: TransportDirection;
  executionLocus: ExecutionLocus;
  toolBinding: ToolBinding;
  // scopes this connector supports; if length > 1 the UI must let the user pick one when binding
  supportedScopes: IdentityScope[];
  // preselected scope (∈ supportedScopes)
  defaultScope: IdentityScope;
}

export interface ConnectorCatalogEntry {
  code: string;
  name: string;
  description: string | null;
  // null when the connector has no descriptor
  capabilities: ConnectorCapabilities | null;
  integrationMeta: IntegrationMeta | null;
}
