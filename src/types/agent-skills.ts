// Agent-Skill binding types

// Per-agent status of a connector the skill declares. connectionId === null means
// the agent has no active connection of this type yet → prompt to connect it.
export interface AgentSkillConnectorStatus {
  connectorCode: string;
  connectionId: string | null;
}

export interface AgentSkillResponse {
  id: string;
  agentId: string;
  skillId: string;
  skillName: string | null;
  connectors: AgentSkillConnectorStatus[];
  // True when the bound public skill was updated by its owner since this binding.
  needsReinstall: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentSkillRequest {
  skillId: string;
}
