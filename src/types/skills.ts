// Skill types

export interface SkillResponse {
  id: string;
  name: string;
  description: string | null;
  // Connector codes declared in the SKILL.md frontmatter (`connectors: [...]`).
  connectorCodes: string[];
  version: number;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDetailResponse extends SkillResponse {
  // SKILL.md body WITHOUT frontmatter. Name/description/connectors live in the
  // dedicated fields above — do not parse frontmatter on the frontend.
  mdContent: string;
}

// Request bodies still send the full SKILL.md (frontmatter + body) as `skillMd`;
// the backend parses name/description/connectors out of the frontmatter.
export interface CreateSkillRequest {
  skillMd: string;
  isPublic?: boolean;
}

export interface UpdateSkillRequest {
  skillMd: string;
  isPublic?: boolean;
}

// Connector catalog entry (from GET /control/manage/connectors/)

export interface IntegrationMeta {
  // field code → human-readable label (keys are sent as credential codes)
  credentialFields: Record<string, string>;
  supportsWebhooks: boolean;
}

// who initiates the connection: we connect to the platform (OUTBOUND) vs device connects to us (INBOUND)
export type TransportDirection = 'OUTBOUND' | 'INBOUND';
// who actually executes the tool's work (trust boundary — does data leave our infra):
// BACKEND = effect lives in our infra; DELEGATED = an external system does the work
// (control-api only proxies); AGENT = the calling agent runs it (loopback).
export type ExecutionLocus = 'BACKEND' | 'DELEGATED' | 'AGENT';
// fixed set (STATIC) vs per-instance discovered (DYNAMIC) tool/trigger definitions
export type DefinitionBinding = 'STATIC' | 'DYNAMIC';
// under which key a connector instance lives. INSTANCE = explicit user-created instance
// (telegram/mcp/app); AGENT/TEAM/USER/GLOBAL = contextual instances materialised on binding.
export type IdentityScope = 'INSTANCE' | 'AGENT' | 'TEAM' | 'USER' | 'GLOBAL';

export interface ConnectorCapabilities {
  transportDirection: TransportDirection;
  executionLocus: ExecutionLocus;
  definitionBinding: DefinitionBinding;
  // scopes this connector supports; if length > 1 the UI must let the user pick one when
  // binding. Ordered — the default scope is the first element (supportedScopes[0]).
  supportedScopes: IdentityScope[];
}

export interface ConnectorCatalogEntry {
  code: string;
  name: string;
  description: string | null;
  // null when the connector has no descriptor
  capabilities: ConnectorCapabilities | null;
  integrationMeta: IntegrationMeta | null;
}
