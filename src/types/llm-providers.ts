// LLM provider and agent LLM binding types

export type LlmProviderType = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'OPENAI_COMPATIBLE';

export interface LlmProviderResponse {
  pubId: string;
  name: string;
  providerType: LlmProviderType;
  baseUrl: string | null;
  apiKeyMask: string;
  availableModels: string[] | null;
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
  availableModels: string[];
  refreshedAt: string;
}

export interface AgentLlmResponse {
  name: string;
  model: string;
  llmProviderPubId: string;
  llmProviderName: string;
  providerType: LlmProviderType;
}

export interface CreateAgentLlmRequest {
  name: string;
  llmProviderPubId: string;
  model: string;
}

export interface UpdateAgentLlmRequest {
  llmProviderPubId: string;
  model: string;
}
