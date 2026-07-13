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
  apiKeyMask: string;
  availableModels: LlmModel[] | null;
  modelsRefreshedAt: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface CreateLlmProviderRequest {
  name: string;
  providerType: LlmProviderType;
  baseUrl?: string | null;
  apiKey: string;
  enabled?: boolean;
}

export interface UpdateLlmProviderRequest {
  name?: string;
  baseUrl?: string | null;
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
