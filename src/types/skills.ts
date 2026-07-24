// Skill types

// Which skills the list endpoint returns: MINE = own skills of any visibility
// (default), PUBLIC = all public skills.
export type SkillScope = 'MINE' | 'PUBLIC';

export interface SkillResponse {
  id: string;
  // Machine code (validated kebab-case slug) — not for display.
  name: string;
  // Human-readable display name.
  title: string;
  description: string | null;
  // Connector codes declared in the SKILL.md frontmatter (`connectors: [...]`).
  connectorCodes: string[];
  version: number;
  isPublic: boolean;
  userId: string;
  // Platform skill: read-only for non-admin users (cannot rename/delete/edit).
  system?: boolean;
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

// Replaces the skill's required-connector list wholesale (bumps `version`).
// Empty array = a skill with no connectors (valid). Does NOT touch the SKILL.md body.
export interface UpdateSkillConnectorsRequest {
  connectorCodes: string[];
}

// Connector catalog entry (from GET /control/manage/connectors/)

export interface IntegrationMeta {
  // field code → human-readable label (keys are sent as credential codes)
  credentialFields: Record<string, string>;
  supportsWebhooks: boolean;
}

// who executes a tool call: BACKEND = our backend (or an external platform through it);
// DEVICE = the user's device, the call is delivered by push; LOOPBACK = the calling
// agent itself (e.g. claude-code).
export type ExecutionKind = 'BACKEND' | 'DEVICE' | 'LOOPBACK';
// fixed set (STATIC) vs per-instance discovered (DYNAMIC) tool/trigger definitions
export type DefinitionBinding = 'STATIC' | 'DYNAMIC';

export interface ConnectorCapabilities {
  executionKind: ExecutionKind;
  definitionBinding: DefinitionBinding;
}

export interface ConnectorCatalogEntry {
  code: string;
  name: string;
  description: string | null;
  // null when the connector has no descriptor
  capabilities: ConnectorCapabilities | null;
  integrationMeta: IntegrationMeta | null;
}
