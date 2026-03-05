export type PolicyEffect = 'ALLOW' | 'DENY';

export interface AgentToolPolicyResponse {
  id: string;
  agentPubId: string;
  userPubId: string;
  connectorCode: string | null;
  connectorIdentity: string | null;
  toolName: string | null;
  effect: PolicyEffect;
  priority: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentToolPolicyRequest {
  agentPubId: string;
  connectorCode?: string | null;
  connectorIdentity?: string | null;
  toolName?: string | null;
  effect: PolicyEffect;
  description?: string;
}

export interface UpdateAgentToolPolicyRequest {
  connectorCode?: string | null;
  connectorIdentity?: string | null;
  toolName?: string | null;
  effect?: PolicyEffect;
  description?: string;
}
