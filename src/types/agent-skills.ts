// Agent-Skill binding types

export interface AgentSkillResponse {
  id: string;
  agentId: string;
  skillId: string;
  skillName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentSkillRequest {
  skillId: string;
}
