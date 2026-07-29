// LLM provider and agent LLM binding types

export type LlmProviderType = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'OPENAI_COMPATIBLE';

// How image *generation* is requested from this provider. Providers disagree here
// and `providerType` cannot tell them apart — OpenRouter and Polza are both
// OPENAI_COMPATIBLE — so the choice is the user's, not something we can derive.
//   CHAT_MODALITIES — chat/completions carrying image modalities (OpenRouter and
//                     proxies that pass it through). The backend default.
//   MEDIA_ENDPOINT  — a dedicated media endpoint (Polza, api.polza.ai).
// Getting it wrong is expensive, not just broken: a media-endpoint provider asked
// the chat way answers with a server error or — worse — an empty result that was
// still billed. Hence a visible field rather than a guess.
// Applies to generation only; VISION (image recognition) is identical everywhere.
export type LlmMediaTransport = 'CHAT_MODALITIES' | 'MEDIA_ENDPOINT';

// Extra request parameters merged into every chat/completions call (aggregator
// extensions like OpenRouter `provider` routing). Backend deep-merges provider-level
// ⊕ model-level (model wins, arrays replaced whole). Max 16 KB serialized; never
// a place for secrets — the value reaches workers in plain text.
export type LlmExtraBody = Record<string, unknown>;

// AVAILABLE — present in the provider's latest model listing.
// UNAVAILABLE — dropped from the listing (or never listed). Still bindable and
// still saveable (listings are incomplete often enough), but no longer harmless:
// inside a provider's purpose list such a model is skipped in favour of the next
// one, and as an agent's explicit binding it makes the call fail rather than be
// silently substituted. UI warns, never blocks.
export type LlmProviderModelStatus = 'AVAILABLE' | 'UNAVAILABLE';

// A row of the provider's model registry (null fields are omitted in JSON).
export interface LlmProviderModelResponse {
  id: string;
  // The model identifier at the provider — the key used when binding an agent.
  model: string;
  displayName?: string | null;
  // Context window in tokens, when the provider reports it (OpenRouter/Polza do).
  contextWindow?: number | null;
  // Response token ceiling, when the provider reports it.
  maxOutputTokens?: number | null;
  // Capability fields come from the provider verbatim (mixed case, open set) —
  // compare case-insensitively and render as-is. null = unknown, NOT "can't".
  // e.g. ["text", "image"] — "image" means the model accepts images (vision).
  inputModalities?: string[] | null;
  // e.g. ["text", "image"] — what the model produces (image = gen_image-capable).
  outputModalities?: string[] | null;
  // e.g. ["tools", "reasoning", "response_format", "temperature", ...]
  supportedParameters?: string[] | null;
  extraBody?: LlmExtraBody | null;
  status: LlmProviderModelStatus;
  // null = the provider never listed this model (row created by hand via extra-body upsert).
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
}

// Per-purpose ordered allow-list of models — the provider-level answer to "which
// model serves this purpose". Keys are uppercase `AgentLlmPurpose` values;
// a lowercase or unknown key is rejected with 400 while parsing the body.
//
// Three states, three meanings:
//   key absent   — the purpose is not configured; resolution falls through to the
//                  platform provider;
//   []           — the purpose is switched off deliberately; the chain stops here;
//   [a, b, …]    — priority order: the first model the registry does not mark
//                  UNAVAILABLE wins.
// It is an allow-list, not a UI preset: a model that is not in it is never used.
export type LlmPurposePriority = Partial<Record<AgentLlmPurpose, string[]>>;

export interface LlmProviderResponse {
  id: string;
  name: string;
  providerType: LlmProviderType;
  baseUrl: string | null;
  // null = never set — the backend treats it as CHAT_MODALITIES. Providers created
  // before the field existed answer null, which is "as it was", not a misconfiguration.
  mediaTransport: LlmMediaTransport | null;
  // null = nothing configured for any purpose.
  purposePriority: LlmPurposePriority | null;
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
  // Omitted = let the backend default to CHAT_MODALITIES.
  mediaTransport?: LlmMediaTransport;
  purposePriority?: LlmPurposePriority;
  apiKey: string;
  enabled?: boolean;
  extraBody?: LlmExtraBody;
}

export interface UpdateLlmProviderRequest {
  name?: string;
  baseUrl?: string | null;
  // Same partial semantics as the rest: absent = keep, present = overwrite.
  mediaTransport?: LlmMediaTransport;
  // Replaces the whole map — keys are not merged. Absent = keep, {} = clear.
  // Editing one purpose still means sending every other purpose back untouched.
  purposePriority?: LlmPurposePriority;
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
  purposePriority?: LlmPurposePriority;
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
// has zero user bindings and the platform provider is enabled with a non-empty
// CHAT list (its `model` is that list's first entry). Not addressable
// (llmProviderId is null) and not persisted, so it must not be edited/deleted.
export type AgentLlmSource = 'USER' | 'PLATFORM';

// CHAT — the agent's main conversation model; the rest are tool models for the
// media connector (image generation / vision / speech-to-text / text-to-speech).
// The purpose IS the binding's identity: one model per purpose per agent, and
// the value travels in the PUT/DELETE path (uppercase — lowercase gives 400).
// Resolution order, with no guessing at any step: the agent's own binding →
// `purposePriority` of the provider carrying the agent's CHAT binding → the
// platform provider's. Nothing found = the tool call fails, and the user reads
// the reason verbatim in the chat.
// AUDIO_IN/AUDIO_OUT are accepted and stored everywhere, but no speech tools
// exist yet — bindings on them do nothing so far.
export type AgentLlmPurpose = 'CHAT' | 'IMAGE' | 'VISION' | 'AUDIO_IN' | 'AUDIO_OUT';

export interface AgentLlmResponse {
  model: string;
  // Identifies the binding — the {purpose} path segment of PUT/DELETE.
  purpose: AgentLlmPurpose;
  // null for the synthetic PLATFORM record — the provider is system-owned.
  llmProviderId: string | null;
  llmProviderName: string;
  providerType: LlmProviderType;
  source: AgentLlmSource;
}

export interface CreateAgentLlmRequest {
  llmProviderId: string;
  model: string;
  // Omitted → CHAT. 409 when the purpose is already bound — PUT instead.
  purpose?: AgentLlmPurpose;
}

// The purpose is not part of the body — it comes from the path and cannot change
// (moving a model to another purpose = delete + create).
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
