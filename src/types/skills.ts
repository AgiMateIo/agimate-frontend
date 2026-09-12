// Skill types

// Which skills the list endpoint returns: MINE = own skills of any visibility
// (default), PUBLIC = all public skills.
export type SkillScope = 'MINE' | 'PUBLIC';

// One entry of an access-rule allow-list: a tool/trigger name, optionally
// narrowed to calls whose arguments match `params` (the ALLOW row's
// `paramsFilter`). Always an object in JSON — the bare-string form exists only
// in SKILL.md frontmatter.
export interface SkillAccessRule {
  name: string;
  params?: Record<string, unknown> | null;
}

// Exactly one of `allow`/`deny`. `allow` is an allow-list: on the agent's
// binding it becomes a binding-wide DENY plus an ALLOW per entry — which
// narrows the agent on that instance *outside* the skill as well. `deny` is a
// DENY per name on top of default-allow.
export type SkillAccessRules =
  | { allow: SkillAccessRule[]; deny?: null }
  | { deny: string[]; allow?: null };

// One connector a skill declares it needs (the object form of the SKILL.md
// `connectors:` entry; the short form `- mcp` is `{code: mcp, key: mcp}`).
// Everything that used to go by code now goes by `key`: two MCP servers in one
// skill share a code and differ by key.
export interface SkillConnectorRequirement {
  code: string;
  // Defaults to `code`; unique within the skill. The connections map of a
  // binding is keyed by it.
  key: string;
  // Caption for the wizard. Absent here = derived server-side (see the `title`
  // of a binding's connector status, which is always filled).
  title?: string | null;
  // Non-secret credential-form values to pre-fill the create form with (an MCP
  // server's URL). Never on an internal connector, never a SECRET field.
  params?: Record<string, string> | null;
  tools?: SkillAccessRules | null;
  triggers?: SkillAccessRules | null;
}

export interface SkillResponse {
  id: string;
  // Machine code (validated kebab-case slug) — not for display.
  name: string;
  // Human-readable display name.
  title: string;
  description: string | null;
  // Distinct connector codes, derived from `connectors`. Kept for the readers
  // that only care about *which* connectors (presets, counters); anything
  // that chooses an instance reads `connectors`.
  connectorCodes: string[];
  // The requirements as declared, in declaration order. Optional only while a
  // backend that predates requirements may still answer — read through
  // `skillRequirements()` in `src/utils/skill.ts`.
  connectors?: SkillConnectorRequirement[];
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

// Replaces the skill's requirement list wholesale (bumps `version`). Empty
// array = a skill with no connectors (valid). Does NOT touch the SKILL.md body.
// `key` may be left out (defaults to `code`). The legacy `{connectorCodes}`
// body is still accepted server-side but is not sent from here any more.
export interface UpdateSkillConnectorsRequest {
  connectors: SkillConnectorRequirement[];
}

// Connector catalog entry (from GET /control/manage/connectors/)

// How a credential field is entered. The backend owns this list and may grow
// it, hence the open union — an unrecognised type is treated as SECRET, because
// masking a plain value is a nuisance while printing a secret is not.
export type CredentialFieldType = 'URL' | 'SECRET' | 'JSON' | 'TEXT' | (string & {});

// One declared credential input. Replaces the bare label string the catalog
// used to return, so masking and optionality are no longer guessed from the
// field's name and the wording of its label.
export interface CredentialFieldSpec {
  label: string;
  type: CredentialFieldType;
  required: boolean;
}

export interface IntegrationMeta {
  // field code → its declaration (keys are sent as credential codes)
  credentialFields: Record<string, CredentialFieldSpec>;
  supportsWebhooks: boolean;
}

// who executes a tool call: BACKEND = our backend (or an external platform through it);
// APP = the user's app/device, the call is delivered by push; LOOPBACK = the calling
// agent itself (e.g. claude-code). The backend owns this list and grows it, so render
// an unknown value as itself instead of assuming a label exists.
export type ExecutionKind = 'BACKEND' | 'APP' | 'LOOPBACK';
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
