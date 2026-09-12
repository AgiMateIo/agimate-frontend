// Agent-Skill binding types
//
// A skill and a connection are managed separately; two indicators tie them
// together — the skill says whether it has the connections it needs, the
// connection says how many skills use it. The gate is live: an unsatisfied
// skill does not reach the agent at all, neither as prompt text nor as tools.

import type { AccessEffect, PolicyKind } from './agent-connections';
import type { CredentialFieldSpec } from './skills';

// A connection of the user that fits one requirement of a skill: by identity
// (the same MCP URL) when the requirement resolves to one, otherwise every
// instance of the connector code.
export interface SkillConnectorMatch {
  connectionId: string;
  // Legitimately null, as on the connection itself.
  name: string | null;
  // Already open to this agent — choosing it costs no extra request.
  boundToAgent: boolean;
}

// One access-rule row the skill declares, as it will be written onto the
// agent's binding to the chosen instance. `name: null` with DENY is the
// binding-wide row of an allow-list: it narrows the agent on that instance
// everywhere, not only inside the skill.
export interface SkillDesiredPolicy {
  kind: PolicyKind;
  name: string | null;
  effect: AccessEffect;
  paramsFilter: Record<string, unknown> | null;
}

// "Requirement × agent" — one record before and after binding. The plan
// (`GET /agents/{id}/skills/plan`) answers it unbound, with `matches` and the
// create form; the bindings listing answers it with `connectionId`,
// `satisfied` and `policyConflicts` filled.
export interface AgentSkillConnectorStatus {
  // What the binding's connections map is keyed by. Equals `connectorCode`
  // unless the skill declared its own key (two MCP servers in one skill).
  key: string;
  connectorCode: string;
  // Caption for the wizard: the skill's own title, else the key, else the
  // connector name — always filled server-side.
  title: string;
  // Internal connectors (memory, board, sheets, time, media) have exactly one
  // instance per user — nothing to choose, but it still has to be opened to the
  // agent like any other connection. `matches` and `credentialFields` are empty.
  internal: boolean;
  // Non-secret credential values the skill declares — pre-fill the create form.
  params: Record<string, string> | null;
  // The integration's credentials form (same shape as the catalog's), in
  // render order. null for an internal connector.
  credentialFields: Record<string, CredentialFieldSpec> | null;
  // The instance identity the params resolve to (an MCP server's URL); null
  // when unknown — then `matches` is every instance of the code.
  identity: string | null;
  matches: SkillConnectorMatch[];
  // The instance this binding points at. null = none chosen. For bindings made
  // before instance selection existed the backend still fills the old
  // "any connection of this type" value, so working agents don't turn red.
  connectionId: string | null;
  connectionName: string | null;
  // Instance chosen *and* open to the agent. `connectionId` set together with
  // `satisfied: false` is its own case: the instance is chosen but not open —
  // fixed by opening that connection, not by choosing another one.
  satisfied: boolean;
  // The rules the skill declares, as the rows they become on the binding.
  policies: SkillDesiredPolicy[];
  // Declared rules NOT applied, as "TOOL/query-docs" / "TOOL/*": a rule of
  // another origin (the user's, another skill's) already holds that (kind,
  // name). Only meaningful after binding; the plan answers an empty list.
  policyConflicts: string[];
}

// GET /manage/agents/{agentId}/skills/plan?skillId= — what binding this skill
// to this agent would take. Order of the steps it implies is mandatory: create
// the missing connection, open it to the agent, then bind the skill — the
// rules are written on the last step and need the binding to exist.
export interface SkillBindingPlanResponse {
  skillId: string;
  skillName: string;
  satisfied: boolean;
  connectors: AgentSkillConnectorStatus[];
}

// How a skill's body reaches the agent: `EAGER` puts it in the prompt whole,
// `LAZY` leaves the agent to fetch it when it decides it needs it. Read only for
// an agent that has the `skill-loader` skill bound — without it every body goes
// into the prompt whatever this says.
export type SkillDisclosure = 'EAGER' | 'LAZY';

export interface AgentSkillResponse {
  id: string;
  agentId: string;
  skillId: string;
  skillName: string | null;
  connectors: AgentSkillConnectorStatus[];
  // Conjunction over `connectors`. False means the agent does not get this
  // skill — a warning, not a hint.
  satisfied: boolean;
  // True when the bound public skill was updated by its owner since this binding.
  needsReinstall: boolean;
  // What is in effect: this binding's override, or the skill's own default.
  disclosure: SkillDisclosure;
  // What this binding overrides it with; null = the skill's default is in
  // effect. The default itself is never returned on its own — when the override
  // is null it *is* `disclosure`, and with an override set there is no way to
  // ask what inheriting would give.
  disclosureOverride: SkillDisclosure | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentSkillRequest {
  skillId: string;
  // Which instance to use per requirement *key* (equal to the connector code
  // for skills that declared none). Required for every external requirement
  // (400 otherwise — two accounts of the same service are not guessed apart);
  // must be omitted for internal ones and for keys the skill never declared.
  connections?: Record<string, string>;
  // Absent or null: the binding inherits the skill's own default.
  disclosure?: SkillDisclosure;
}

// PUT /manage/agents/{agentId}/skills/{skillId}/connections — replaces the whole
// map, keyed by requirement key: a key absent from the body is left without an
// instance.
export type UpdateAgentSkillConnectionsRequest = Record<string, string>;

// PATCH /manage/agents/{agentId}/skills/{skillId} — the one field, and it is
// required. `INHERIT` drops the override rather than `null`, which everywhere
// else in the API means "leave this field alone".
export interface UpdateAgentSkillDisclosureRequest {
  disclosure: SkillDisclosure | 'INHERIT';
}
