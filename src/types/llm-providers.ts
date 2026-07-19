// LLM provider and agent LLM binding types

export type LlmProviderType = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'OPENAI_COMPATIBLE';

// Extra request parameters merged into every chat/completions call (aggregator
// extensions like OpenRouter `provider` routing). Backend deep-merges provider-level
// ⊕ model-level (model wins, arrays replaced whole). Max 16 KB serialized; never
// a place for secrets — the value reaches workers in plain text.
export type LlmExtraBody = Record<string, unknown>;

// AVAILABLE — present in the provider's latest model listing.
// UNAVAILABLE — advisory only: dropped from the listing (or never listed), but
// still bindable and still served credentials at runtime. UI warns, never blocks.
export type LlmProviderModelStatus = 'AVAILABLE' | 'UNAVAILABLE';

// A row of the provider's model registry (null fields are omitted in JSON).
export interface LlmProviderModelResponse {
  id: string;
  // The model identifier at the provider — the key used when binding an agent.
  model: string;
  displayName?: string | null;
  // Context window in tokens, when the provider reports it (OpenRouter/Polza do).
  contextWindow?: number | null;
  // e.g. ["text", "image"] — "image" means the model accepts images (vision).
  inputModalities?: string[] | null;
  // e.g. ["tools", "reasoning"]
  supportedParameters?: string[] | null;
  extraBody?: LlmExtraBody | null;
  status: LlmProviderModelStatus;
  // null = the provider never listed this model (row created by hand via extra-body upsert).
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
}

export interface LlmProviderResponse {
  id: string;
  name: string;
  providerType: LlmProviderType;
  baseUrl: string | null;
  // Fallback model on the platform row; a UI preselect on user providers.
  defaultModel: string | null;
  apiKeyMask: string;
  modelsRefreshedAt: string | null;
  extraBody: LlmExtraBody | null;
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
  extraBody?: LlmExtraBody;
}

export interface UpdateLlmProviderRequest {
  name?: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  apiKey?: string;
  enabled?: boolean;
  // Partial semantics: absent/null = keep, {} = clear.
  extraBody?: LlmExtraBody | null;
}

// Create the system-owned platform provider (ADMIN only). `name` is not accepted —
// the backend forces it to "platform". The row is created disabled; enable it via
// PATCH after configuring free-tier quotas.
export interface CreatePlatformLlmProviderRequest {
  providerType: LlmProviderType;
  baseUrl?: string | null;
  defaultModel?: string | null;
  apiKey: string;
}

// Refresh is an upsert: listed models become AVAILABLE, missing ones flip to
// UNAVAILABLE (never deleted). Returns the full registry.
export interface RefreshModelsResponse {
  models: LlmProviderModelResponse[];
  refreshedAt: string;
}

// PUT /llm-providers/{id}/models/extra-body — `model` travels in the body
// (model ids contain "/"). Upserts a registry row if the model was never listed.
export interface UpdateModelExtraBodyRequest {
  model: string;
  // null clears the per-model override (the row remains).
  extraBody: LlmExtraBody | null;
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

// Change only the limit of an existing quota — subjectKind/window are the quota's
// key and cannot change (delete + recreate to move a quota to another subject/window).
export interface UpdateLlmQuotaRequest {
  limitTokens: number;
}
