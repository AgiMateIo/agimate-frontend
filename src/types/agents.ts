// Agent types

export type TriggerDestination = 'centrifugo' | 'webhook' | 'ignore';

export interface AgentResponse {
  id: string;
  apiKeyPubId: string;
  name: string;
  prompt: string;
  triggersAllowAll: boolean;
  triggersTo: TriggerDestination;
  webhookUrl: string | null;
  hasWebhookAuth: boolean;
  createdAt: string;
}

export interface CreateAgentRequest {
  apiKeyPubId: string;
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
  triggersAllowAll?: boolean;
  triggersTo?: TriggerDestination;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
}
