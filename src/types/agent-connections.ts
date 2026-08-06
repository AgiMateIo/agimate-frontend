// Agent ↔ connector bindings and their refinement policies.
//
// Binding (agent_connections): the gate — an agent can only see/call a connector instance it is
// bound to, and a tool now comes from *that* instance rather than from any connection of its type.
// Bindings are default-allow. Endpoints: /manage/agents/{agentId}/connections/.
// Bind/unbind works for every connector, internal ones included: skills stopped creating bindings,
// so there is no automatic sync left to fight with.
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
  // Internal connector: exactly one instance per user. Informational only — it
  // no longer blocks unbinding, since skills stopped creating bindings.
  managedBySkills: boolean;
  // How many of *this agent's* skills point at this instance. Zero means the
  // connection is open but no skill uses it: behind the skill gate its tools
  // never enter the agent's context — a dead binding, worth a warning.
  usedBySkills: number;
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

// Exactly one of the two fields — both or neither is a 400. An internal
// connector is addressed by *code* because its single instance may not exist
// yet: the backend materializes the row and answers with it.
export type BindConnectionRequest =
  | { connectionId: string; connectorCode?: never }
  | { connectorCode: string; connectionId?: never };

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
