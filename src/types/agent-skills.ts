// Agent-Skill binding types

export interface AgentSkillResponse {
  id: string;
  agentPubId: string;
  skillPubId: string;
  skillName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentSkillRequest {
  skillPubId: string;
}
