// Agent ↔ connector bindings and their refinement policies.
//
// Binding (agent_connections): the gate — an agent can only see/call a connector instance it is
// bound to. Bindings are default-allow. Endpoints: /manage/agents/{agentId}/connections/.
// Bind/unbind is only allowed for *external* connectors (telegram/mcp/app); internal-connector
// bindings are synced automatically from the agent's skills (the backend answers 400).
// Policy (agent_connection_policies): optional refinement over a binding (deny-list / allow-list /
// param filter). Endpoints: /manage/agent-connections/{agentConnectionId}/policies/.

export type PolicyKind = 'TOOL' | 'TRIGGER';
export type AccessEffect = 'ALLOW' | 'DENY';

export interface AgentConnectionResponse {
  // binding id — used as {agentConnectionId} for the policy endpoints
  id: string;
  connectionId: string;
  connectorCode: string;
  fullCode: string;
  name: string;
  enabled: boolean;
  createdAt: string;
}

export interface BindConnectionRequest {
  // an existing connection instance of an *external* connector
  connectionId: string;
}

export interface AgentConnectionPolicyResponse {
  id: string;
  agentConnectionId: string;
  kind: PolicyKind;
  // tool/trigger name; null = rule on the whole connector (binding-wide)
  name: string | null;
  effect: AccessEffect;
  paramsFilter: Record<string, unknown> | null;
  description: string | null;
  source: string | null;
  createdAt: string;
}

export interface CreatePolicyRequest {
  kind: PolicyKind;
  // null = binding-wide rule
  name?: string | null;
  effect: AccessEffect;
  paramsFilter?: Record<string, unknown> | null;
  description?: string | null;
}

// PATCH: effect/description partial (null = leave unchanged);
// paramsFilter is replaced wholesale (null = clear the filter).
export interface UpdatePolicyRequest {
  effect?: AccessEffect;
  paramsFilter?: Record<string, unknown> | null;
  description?: string | null;
}
