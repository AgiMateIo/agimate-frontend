// modules/llmProviders.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  LlmProviderResponse,
  CreateLlmProviderRequest,
  UpdateLlmProviderRequest,
  RefreshModelsResponse,
} from '@/types';

export const llmProvidersApi = {
  // LLM Providers
  async getLlmProviders(): Promise<LlmProviderResponse[]> {
    return httpClient.get<LlmProviderResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/`);
  },

  async createLlmProvider(data: CreateLlmProviderRequest): Promise<LlmProviderResponse> {
    return httpClient.post<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/`, data);
  },

  async updateLlmProvider(id: string, data: UpdateLlmProviderRequest): Promise<LlmProviderResponse> {
    return httpClient.patch<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}`, data);
  },

  async deleteLlmProvider(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}`);
  },

  async refreshLlmProviderModels(id: string): Promise<RefreshModelsResponse> {
    return httpClient.post<RefreshModelsResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}/refresh-models`, {});
  },
};
