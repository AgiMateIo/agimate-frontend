// Agent types

export type TriggerDestination = 'CENTRIFUGO' | 'WEBHOOK';

export interface AgentResponse {
  id: string;
  name: string;
  maskedKeyId: string;
  prompt: string;
  triggerDestination: TriggerDestination;
  webhookUrl: string | null;
  hasWebhookAuth: boolean;
  enabled: boolean;
  agenticTeamId: string | null;
  agenticTeamName: string | null;
  createdAt: string;
}

export interface AgentCreatedResponse {
  agent: AgentResponse;
  fullKey: string;
}

// Lightweight agent representation used by GET /device/manage/skills/{pubId}/agents/
export interface AgentSummaryResponse {
  id: string;
  name: string;
  prompt: string | null;
  enabled: boolean;
}

export interface CreateAgentRequest {
  name: string;
  prompt?: string;
  triggerDestination?: TriggerDestination;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  agenticTeamPubId?: string | null;
}

export interface UpdateAgentRequest {
  name?: string;
  prompt?: string;
  triggerDestination?: TriggerDestination;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  enabled?: boolean;
}
