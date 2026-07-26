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

// Reverse listing of the same binding row: which agents a connection is available to.
// `id` is the *binding* id (the {agentConnectionId} of the policy endpoints), `agentId` the
// agent itself; `enabled` is the agent's flag, not the connection's — disabled agents stay in
// the list, since their owner can re-enable them and the binding comes back to life.
// This is an inventory of access ("who is affected by a change"), not a delivery forecast:
// events also depend on the connection being enabled and on the binding's policies.
export interface ConnectionAgentResponse {
  id: string;
  agentId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  // when the connection was bound to the agent
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
