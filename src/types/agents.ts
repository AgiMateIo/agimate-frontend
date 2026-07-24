// Agent types

import type { AgentLlmResponse } from './llm-providers';

export type AgentType = 'CENTRIFUGO' | 'WEBHOOK' | 'GENERIC';

export interface AgentSkillSummary {
  id: string;
  name: string;
}

export interface AgentResponse {
  id: string;
  name: string;
  description: string | null;
  maskedKeyId: string;
  instructions: string;
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

export interface UpdateAgentRequest {
  name?: string;
  description?: string | null;
  instructions?: string;
  type?: AgentType;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  enabled?: boolean;
}
