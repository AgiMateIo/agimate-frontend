export type PolicyEffect = 'ALLOW' | 'DENY';
export type PolicyKind = 'tool' | 'trigger';

// Normalized response for UI — backend returns toolName or triggerName,
// mapped to resourceName by API service
export interface AgentPolicyResponse {
  id: string;
  agentId: string;
  userId: string;
  connectorCode: string | null;
  connectorIdentity: string | null;
  resourceName: string | null;
  effect: PolicyEffect;
  priority: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentPolicyRequest {
  agentId: string;
  connectorCode?: string | null;
  connectorIdentity?: string | null;
  resourceName?: string | null;
  effect: PolicyEffect;
  description?: string;
}

export interface UpdateAgentPolicyRequest {
  connectorCode?: string | null;
  connectorIdentity?: string | null;
  resourceName?: string | null;
  effect?: PolicyEffect;
  description?: string;
}
