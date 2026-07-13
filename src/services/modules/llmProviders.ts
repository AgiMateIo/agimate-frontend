// modules/llmProviders.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  LlmProviderResponse,
  CreateLlmProviderRequest,
  CreatePlatformLlmProviderRequest,
  UpdateLlmProviderRequest,
  RefreshModelsResponse,
  LlmUsageResponse,
  LlmQuota,
  CreateLlmQuotaRequest,
  UpdateLlmQuotaRequest,
} from '@/types';

export const llmProvidersApi = {
  // LLM Providers
  async getLlmProviders(): Promise<LlmProviderResponse[]> {
    return httpClient.get<LlmProviderResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/`);
  },

  async createLlmProvider(data: CreateLlmProviderRequest): Promise<LlmProviderResponse> {
    return httpClient.post<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/`, data);
  },

  // ADMIN only — creates the singleton platform provider (disabled). 409 if it already exists.
  async createPlatformLlmProvider(data: CreatePlatformLlmProviderRequest): Promise<LlmProviderResponse> {
    return httpClient.post<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/platform`, data);
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

  // Token usage — one entry per provider the current user can see (own providers
  // report the whole provider's spend; the platform entry reports the caller's spend).
  async getLlmUsage(): Promise<LlmUsageResponse[]> {
    return httpClient.get<LlmUsageResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-usage/`);
  },

  // Quotas — scoped to a provider owned by the caller.
  async getLlmProviderQuotas(providerId: string): Promise<LlmQuota[]> {
    return httpClient.get<LlmQuota[]>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${providerId}/quotas/`);
  },

  async createLlmProviderQuota(providerId: string, data: CreateLlmQuotaRequest): Promise<LlmQuota> {
    return httpClient.post<LlmQuota>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${providerId}/quotas/`, data);
  },

  async updateLlmProviderQuota(providerId: string, quotaId: string, data: UpdateLlmQuotaRequest): Promise<LlmQuota> {
    return httpClient.patch<LlmQuota>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${providerId}/quotas/${quotaId}`, data);
  },

  async deleteLlmProviderQuota(providerId: string, quotaId: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${providerId}/quotas/${quotaId}`);
  },
};
