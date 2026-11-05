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
//   key absent   — the purpose is not configured at this provider; a BYOK agent
//                  moves on to the next chat provider's list (the platform is
//                  never a fallback in BYOK);
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
  // null = nothing configured for any purpose. Platform providers always answer
  // null: their assignments live in `platform_llms` (see PlatformLlmEntryResponse)
  // and PATCH refuses this field on a platform row with a 400.
  purposePriority: LlmPurposePriority | null;
  apiKeyMask: string;
  modelsRefreshedAt: string | null;
  extraBody: LlmExtraBody | null;
  enabled: boolean;
  // true for the system-owned platform providers (visible to ADMIN only). There
  // can be several — one per vendor, each with its own key and quotas — and
  // their names are ordinary, unique among the platform rows. A platform row can
  // be deleted only while no platform assignment references it.
  platform: boolean;
  createdAt: string;
}

// GET /llm-providers/catalog/ — known gateways with ready-made values for the
// create form. Pre-fill only: the catalog takes no part in how a provider works,
// and later catalog changes never touch a provider that was already created.
// Server-sorted and server-filtered — render in the order received; entries
// disabled on this installation never arrive. An empty list is legal (no
// recommendations here), not an error: the form then opens blank, as before.
export interface LlmProviderCatalogEntry {
  // Record key (`openrouter`, `polza`) — the React key of the choice list.
  code: string;
  // Gateway name, for the choice screen only: `name` in the request is always
  // the user's (it must be unique within their account).
  name: string;
  // One sentence about the provider, in the installation's language.
  description?: string | null;
  providerType: LlmProviderType;
  // For OPENAI_COMPATIBLE this is the value the user cannot know by heart, and
  // creation without it is a 400.
  baseUrl?: string | null;
  // null = the default (CHAT_MODALITIES). A value, not a blank — do not render
  // it as "unfilled" or flag it.
  mediaTransport?: LlmMediaTransport | null;
  // Models to start with. Unverified: shipped with the installation, so it can
  // lag behind the provider's listing — reconcile against the registry after
  // refresh-models rather than trusting it.
  purposePriority?: LlmPurposePriority | null;
  // Page where the user gets the key.
  apiKeyUrl?: string | null;
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
  // Absent/null = the type is kept. Validated together with the resulting
  // `baseUrl`: switching to OPENAI_COMPATIBLE while neither this request nor
  // the stored row carries one answers 400, so the edit form checks the pair
  // before sending.
  providerType?: LlmProviderType | null;
  baseUrl?: string | null;
  // Same partial semantics as the rest: absent = keep, present = overwrite.
  mediaTransport?: LlmMediaTransport;
  // Replaces the whole map — keys are not merged. Absent = keep, {} = clear.
  // Editing one purpose still means sending every other purpose back untouched.
  // Not accepted for a platform row (400): platform assignments are their own
  // resource, PUT/DELETE /manage/admin/platform-llms/{purpose}.
  purposePriority?: LlmPurposePriority;
  apiKey?: string;
  enabled?: boolean;
  // Partial semantics: absent/null = keep, {} = clear.
  extraBody?: LlmExtraBody | null;
}

// Create a system-owned platform provider (ADMIN only). `name` is required and
// unique among the platform rows (a duplicate answers 409); it is no longer
// forced to "platform". The row is created disabled; enable it via PATCH once
// its free-tier quotas are set. Purpose assignments are not created here — they
// live in `platform_llms` (PUT /manage/admin/platform-llms/{purpose}).
export interface CreatePlatformLlmProviderRequest {
  name: string;
  providerType: LlmProviderType;
  baseUrl?: string | null;
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

// Which way an agent's models are chosen. The two chains never mix:
//   PLATFORM — only the platform's purpose chains run; the agent's own bindings
//              stay stored but inactive (they can be deleted, not edited).
//   BYOK     — only the agent's own bindings and the purpose lists of its chat
//              providers; the platform is never substituted for any purpose.
// A brand-new agent is always PLATFORM; switching is an explicit request
// (PUT /agents/{agentId}/llm-source) because it changes who pays.
export type AgentLlmSource = 'PLATFORM' | 'BYOK';

// USER — a real `agent_llms` row.
// PLATFORM — an effective link of a platform chain. Synthesized from
// `platform_llms` (not persisted on the agent), not addressable
// (`llmProviderId` is null), so it must not be edited or deleted.
export type AgentLlmBindingSource = 'USER' | 'PLATFORM';

// CHAT — the agent's main conversation model; ROUTINE — the platform's own
// housekeeping over the agent's conversations (compressing a long one into a
// summary, naming it), where a cheap fast model beats a clever one; the rest are
// tool models for the media connector (image generation / vision /
// speech-to-text / text-to-speech).
// A purpose holds an ordered chain of up to five bindings: the server takes the
// first one it can use (provider enabled, model still listed, quota left, the
// model serves the purpose's modality) and reports no reason for skipping —
// order of attempts is all the UI can honestly show. The purpose travels in the
// PUT/DELETE path (uppercase — lowercase gives 400); a position inside it is
// `priority`, assigned by the server from the order it was given.
// Resolution follows `llmSource`:
//   PLATFORM — the platform's chain for the purpose;
//   BYOK     — the agent's own chain → `purposePriority` lists of the providers
//              carrying its CHAT bindings. Nothing found = the tool call fails,
//              and the user reads the reason verbatim in the chat.
// ROUTINE is the exception: it never fails — with nothing bound it takes a model
// of the CHAT provider and, failing that, the chat model itself.
// AUDIO_IN/AUDIO_OUT are accepted and stored everywhere, but no speech tools
// exist yet — bindings on them do nothing so far.
export type AgentLlmPurpose = 'CHAT' | 'ROUTINE' | 'IMAGE' | 'VISION' | 'AUDIO_IN' | 'AUDIO_OUT';

export interface AgentLlmResponse {
  model: string;
  purpose: AgentLlmPurpose;
  // Position in the purpose's chain, 0 = first attempt. Always a number now:
  // platform links are numbered like the agent's own.
  priority: number;
  // null for a PLATFORM row — the provider is system-owned and the id cannot be
  // sent to any agent-binding endpoint.
  llmProviderId: string | null;
  llmProviderName: string;
  providerType: LlmProviderType;
  source: AgentLlmBindingSource;
  // Whether this row takes part in resolution. PLATFORM rows are always active;
  // a BYOK agent's rows are always active; a PLATFORM agent's own rows are
  // inactive — kept so they can be deleted.
  active: boolean;
}

// One link of a chain in a PUT body — the position is its array index.
export interface AgentLlmBindingRequest {
  llmProviderId: string;
  model: string;
}

export interface CreateAgentLlmRequest {
  llmProviderId: string;
  model: string;
  // Omitted → CHAT. Appends to the end of the purpose's chain (priority = max + 1).
  // 409 when the chain is full (five links), this provider + model pair is
  // already in it, or a concurrent request took the position.
  purpose?: AgentLlmPurpose;
}

// Replaces the whole chain of one purpose, in the order given — the index is the
// priority. [] is equivalent to DELETE. There is no single-link update: editing
// one link sends every other one back untouched.
export interface UpdateAgentLlmRequest {
  bindings: AgentLlmBindingRequest[];
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
  // null for platform providers (system-owned, not addressable). Several
  // platform rows can be present — one per enabled platform provider — so
  // `providerName` is what tells them apart; never assume a single one.
  llmProviderId: string | null;
  providerName: string;
  source: AgentLlmBindingSource;
  windows: LlmUsageWindow[];
}

// --- Platform purpose chains (ADMIN) ---

// GET /manage/admin/platform-llms/ — one link of a platform chain, flat. The
// server orders purposes by the enum and links within a purpose by `priority`.
export interface PlatformLlmEntryResponse {
  llmProviderId: string;
  providerName: string;
  providerType: LlmProviderType;
  purpose: AgentLlmPurpose;
  priority: number;
  model: string;
}

// PUT /manage/admin/platform-llms/{purpose} — replaces that purpose's chain in
// the order given; `[]` is the same as DELETE. Links must belong to platform
// providers; the server assigns `priority` from the array index.
export interface PlatformLlmBindingsRequest {
  bindings: AgentLlmBindingRequest[];
}

// TOTAL — cap across all agents using this provider.
// AGENT — per-agent cap. USER — per-user cap (meaningful on platform providers).
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
