// Agent settings types

export type TriggerDestination = 'centrifugo' | 'webhook' | 'ignore';

export interface AgentSettingsResponse {
  id: string;
  apiKeyPubId: string;
  prompt: string;
  triggersAllowAll: boolean;
  triggersTo: TriggerDestination;
  tools: string[];
  triggers: string[];
  createdAt: string;
}

export interface CreateAgentSettingsRequest {
  apiKeyPubId: string;
  prompt: string;
  triggersAllowAll: boolean;
  triggersTo: TriggerDestination;
  tools: string[];
  triggers: string[];
}

export interface UpdateAgentSettingsRequest {
  prompt?: string;
  triggersAllowAll?: boolean;
  triggersTo?: TriggerDestination;
  tools?: string[];
  triggers?: string[];
}
