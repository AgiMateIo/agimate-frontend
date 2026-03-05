// Agent types

export type TriggerDestination = 'centrifugo' | 'webhook' | 'ignore';

export interface AgentResponse {
  id: string;
  name: string;
  prompt: string;
  triggersAllowAll: boolean;
  triggersTo: TriggerDestination;
  webhookUrl: string | null;
  hasWebhookAuth: boolean;
  agenticTeamId: string | null;
  agenticTeamName: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface AgentCreatedResponse {
  agent: AgentResponse;
  fullKey: string;
}

export interface CreateAgentRequest {
  name: string;
  prompt: string;
  triggersAllowAll: boolean;
  triggersTo: TriggerDestination;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  agenticTeamPubId?: string | null;
}

export interface UpdateAgentRequest {
  name?: string;
  prompt?: string;
  triggersAllowAll: boolean;
  triggersTo: TriggerDestination;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  enabled?: boolean;
}
