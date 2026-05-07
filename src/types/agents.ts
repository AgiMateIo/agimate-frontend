// Agent types

export type AgentType = 'CENTRIFUGO' | 'WEBHOOK' | 'GENERIC';

export interface AgentSkillSummary {
  pubId: string;
  name: string;
}

export interface AgentResponse {
  id: string;
  name: string;
  description: string | null;
  maskedKeyId: string;
  prompt: string;
  type: AgentType;
  webhookUrl: string | null;
  hasWebhookAuth: boolean;
  enabled: boolean;
  agenticTeamId: string | null;
  agenticTeamName: string | null;
  createdAt: string;
  skills: AgentSkillSummary[];
}

export interface AgentCreatedResponse {
  agent: AgentResponse;
  fullKey: string;
}

// Lightweight agent representation used by GET /device/manage/skills/{pubId}/agents/
export interface AgentSummaryResponse {
  id: string;
  name: string;
  description: string | null;
  prompt: string | null;
  enabled: boolean;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  prompt?: string;
  type?: AgentType;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  agenticTeamPubId?: string | null;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string | null;
  prompt?: string;
  type?: AgentType;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  enabled?: boolean;
}
