// Agent types

import type { AgentLlmResponse } from './llm-providers';

// How events reach the agent — the only thing the type decides now.
// GENERIC runs on the platform (internal queue, platform or user-bound model);
// the other three are the same "brain outside", differing only in the door for
// incoming events: websocket (CENTRIFUGO), HTTP callback (WEBHOOK), or none at
// all (MCP — the external AI client comes for the tools itself).
export type AgentType = 'CENTRIFUGO' | 'WEBHOOK' | 'GENERIC' | 'MCP';

export interface AgentSkillSummary {
  id: string;
  name: string;
}

export interface AgentResponse {
  id: string;
  name: string;
  description: string | null;
  maskedKeyId: string;
  // Clearable, and cleared by sending `""` — so a prompt that was wiped comes
  // back as null, not as an empty string.
  instructions: string | null;
  type: AgentType;
  webhookUrl: string | null;
  hasWebhookAuth: boolean;
  enabled: boolean;
  agenticTeamId: string | null;
  agenticTeamName: string | null;
  createdAt: string;
  skills: AgentSkillSummary[];
  llms: AgentLlmResponse[];
}

export interface AgentCreatedResponse {
  agent: AgentResponse;
  fullKey: string;
}

// Lightweight agent representation used by GET /control/manage/skills/{id}/agents/
export interface AgentSummaryResponse {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  enabled: boolean;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  instructions?: string;
  type?: AgentType;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  agenticTeamId?: string | null;
  // Skills bound in the same transaction as the create (duplicates collapsed;
  // a foreign private skill → 403, an unknown one → 404 and nothing is created).
  skillIds?: string[];
  // Preset the wizard started from (its `name`/slug) — funnel analytics only. Omit for scratch.
  presetName?: string;
}

// Body of PATCH /manage/agents/{id}. Three states per field, and the third one
// is the surprise: absent OR null both mean "leave it alone", and an EMPTY
// STRING is what clears a field. So there is no need to strip nulls before
// sending, and no way to clear anything by sending null.
// `name` is the exception that cannot be cleared at all — "" there is a 400.
// The PUT this replaced is still on the server and still replaces the whole
// agent; nothing here should go back to it.
export interface PatchAgentRequest {
  name?: string;
  description?: string | null;
  instructions?: string | null;
  type?: AgentType;
  // Leave both of these out when moving off WEBHOOK — the server drops the
  // address and deletes the secret on its own.
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  enabled?: boolean;
}
