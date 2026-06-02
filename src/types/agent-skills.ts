// Agent-Skill binding types

export interface AgentSkillResponse {
  id: string;
  agentId: string;
  skillId: string;
  skillName: string | null;
  needsReinstall: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentSkillRequest {
  skillId: string;
}

export interface PolicyDiffEntry {
  policyType: 'TOOL' | 'TRIGGER';
  connectorCode: string;
  name: string | null;
}

export interface PolicyDiffResponse {
  policiesToAdd: PolicyDiffEntry[];
  policiesToRemove: PolicyDiffEntry[];
}
