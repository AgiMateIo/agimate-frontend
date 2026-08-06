// Agent-Skill binding types
//
// A skill and a connection are managed separately; two indicators tie them
// together — the skill says whether it has the connections it needs, the
// connection says how many skills use it. The gate is live: an unsatisfied
// skill does not reach the agent at all, neither as prompt text nor as tools.

// Per-agent status of a connector the skill declares.
export interface AgentSkillConnectorStatus {
  connectorCode: string;
  // The instance this binding points at. null = none chosen. For bindings made
  // before instance selection existed the backend still fills the old
  // "any connection of this type" value, so working agents don't turn red.
  connectionId: string | null;
  connectionName: string | null;
  // Internal connectors (memory, board, sheets, time, media) have exactly one
  // instance per user — nothing to choose, but it still has to be opened to the
  // agent like any other connection.
  internal: boolean;
  // Instance chosen *and* open to the agent. `connectionId` set together with
  // `satisfied: false` is its own case: the instance is chosen but not open —
  // fixed by opening that connection, not by choosing another one.
  satisfied: boolean;
}

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
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentSkillRequest {
  skillId: string;
  // Which instance to use per declared connector code. Required for every
  // external connector the skill declares (400 otherwise — two accounts of the
  // same service are not guessed apart); must be omitted for internal ones and
  // for codes the skill never declared.
  connections?: Record<string, string>;
}

// PUT /manage/agents/{agentId}/skills/{skillId}/connections — replaces the whole
// map: a code absent from the body is left without an instance.
export type UpdateAgentSkillConnectionsRequest = Record<string, string>;
