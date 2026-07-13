// LLM provider and agent LLM binding types

export type LlmProviderType = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'OPENAI_COMPATIBLE';

export interface LlmModel {
  // The model identifier sent back as `model` when creating an AgentLlm.
  id: string;
  // Human-readable name. Optional and may be absent (@JsonInclude(NON_NULL)) or null
  // — fall back to `id`. Always set for Anthropic, usually for Gemini, null for OpenAI.
  displayName?: string | null;
}

export interface LlmProviderResponse {
  id: string;
  name: string;
  providerType: LlmProviderType;
  baseUrl: string | null;
  // Fallback model on the platform row; a UI preselect on user providers.
  defaultModel: string | null;
  apiKeyMask: string;
  availableModels: LlmModel[] | null;
  modelsRefreshedAt: string | null;
  enabled: boolean;
  // true only for the system-owned platform provider (visible to ADMIN only).
  // Its name is locked ("platform") and it cannot be deleted — only disabled.
  platform: boolean;
  createdAt: string;
}

export interface CreateLlmProviderRequest {
  name: string;
  providerType: LlmProviderType;
  baseUrl?: string | null;
  defaultModel?: string | null;
  apiKey: string;
  enabled?: boolean;
}

export interface UpdateLlmProviderRequest {
  name?: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  apiKey?: string;
  enabled?: boolean;
}

export interface RefreshModelsResponse {
  availableModels: LlmModel[];
  refreshedAt: string;
}

// USER — a real `agent_llms` row, editable/deletable as usual.
// PLATFORM — a virtual free-tier fallback the backend synthesizes when the agent
// has zero user bindings and the platform provider is enabled. Not addressable
// (llmProviderId is null) and not persisted, so it must not be edited/deleted.
export type AgentLlmSource = 'USER' | 'PLATFORM';

export interface AgentLlmResponse {
  name: string;
  model: string;
  // null for the synthetic PLATFORM record — the provider is system-owned.
  llmProviderId: string | null;
  llmProviderName: string;
  providerType: LlmProviderType;
  source: AgentLlmSource;
}

export interface CreateAgentLlmRequest {
  name: string;
  llmProviderId: string;
  model: string;
}

export interface UpdateAgentLlmRequest {
  llmProviderId: string;
  model: string;
}

// --- Token usage & quotas ---

export type LlmUsageWindowKind = 'DAY' | 'MONTH';

export interface LlmUsageWindow {
  window: LlmUsageWindowKind;
  // Start of the window in UTC: "yyyy-MM-dd" for DAY, first-of-month for MONTH.
  windowStart: string;
  usedTokens: number;
  requests: number;
  // null = no quota configured for this window (show usage, no progress bar).
  limitTokens: number | null;
  remainingTokens: number | null;
}

export interface LlmUsageResponse {
  // null for the platform provider (system-owned, not addressable).
  llmProviderId: string | null;
  // Technical "platform" for the platform provider — the UI supplies a label.
  providerName: string;
  source: AgentLlmSource;
  windows: LlmUsageWindow[];
}

// TOTAL — cap across all agents using this provider.
// AGENT — per-agent cap. USER — per-user cap (only meaningful on the platform provider).
export type LlmQuotaSubjectKind = 'TOTAL' | 'AGENT' | 'USER';

export interface LlmQuota {
  id: string;
  subjectKind: LlmQuotaSubjectKind;
  window: LlmUsageWindowKind;
  limitTokens: number;
}

export interface CreateLlmQuotaRequest {
  subjectKind: LlmQuotaSubjectKind;
  window: LlmUsageWindowKind;
  limitTokens: number;
}
