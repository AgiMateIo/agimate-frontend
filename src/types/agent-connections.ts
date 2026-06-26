// Agent ↔ connector bindings and their refinement policies.
//
// Binding (agent_connections): the gate — an agent can only see/call a connector instance it is
// bound to. Bindings are default-allow. Endpoints: /manage/agents/{agentId}/connections/.
// Policy (agent_connection_policies): optional refinement over a binding (deny-list / allow-list /
// param filter). Endpoints: /manage/agent-connections/{agentConnectionId}/policies/.

import type { IdentityScope } from './skills';

export type PolicyKind = 'TOOL' | 'TRIGGER';
export type AccessEffect = 'ALLOW' | 'DENY';

export interface AgentConnectionResponse {
  // binding id — used as {agentConnectionId} for the policy endpoints
  id: string;
  connectionId: string;
  connectorCode: string;
  fullCode: string;
  name: string;
  identityScope: IdentityScope;
  // scope carrier (agentId / teamId / userId); null for INSTANCE and GLOBAL
  scopeId: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface BindConnectionRequest {
  connectorCode: string;
  // ∈ capabilities.supportedScopes; null → defaultScope. Ignored for INSTANCE connectors.
  scope?: IdentityScope | null;
  // REQUIRED for INSTANCE connectors (which instance); omit for contextual (AGENT/TEAM/USER) ones.
  connectionId?: string | null;
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
