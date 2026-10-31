// modules/llmProviders.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AgentLlmPurpose,
  LlmProviderCatalogEntry,
  LlmProviderResponse,
  CreateLlmProviderRequest,
  CreatePlatformLlmProviderRequest,
  UpdateLlmProviderRequest,
  RefreshModelsResponse,
  LlmProviderModelResponse,
  UpdateModelExtraBodyRequest,
  LlmUsageResponse,
  LlmQuota,
  CreateLlmQuotaRequest,
  UpdateLlmQuotaRequest,
  PlatformLlmBindingsRequest,
  PlatformLlmEntryResponse,
} from '@/types';

export const llmProvidersApi = {
  // LLM Providers
  async getLlmProviders(): Promise<LlmProviderResponse[]> {
    return httpClient.get<LlmProviderResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/`);
  },

  // Known gateways with ready-made form values. An empty array means this
  // installation ships no recommendations — a legal state, not a failure.
  async getLlmProviderCatalog(): Promise<LlmProviderCatalogEntry[]> {
    return httpClient.get<LlmProviderCatalogEntry[]>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/catalog/`);
  },

  async createLlmProvider(data: CreateLlmProviderRequest): Promise<LlmProviderResponse> {
    return httpClient.post<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/`, data);
  },

  // ADMIN only — creates a platform provider (disabled). There can be several;
  // a duplicate name among them answers 409.
  async createPlatformLlmProvider(data: CreatePlatformLlmProviderRequest): Promise<LlmProviderResponse> {
    return httpClient.post<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/platform`, data);
  },

  async updateLlmProvider(id: string, data: UpdateLlmProviderRequest): Promise<LlmProviderResponse> {
    return httpClient.patch<LlmProviderResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}`, data);
  },

  async deleteLlmProvider(id: string): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}`);
  },

  // ADMIN only: the platform's purpose chains (platform_llms). The same shape
  // as the agent's bindings, but global and provider-addressed. PUT replaces one
  // purpose's chain and answers with it; [] is equivalent to DELETE.
  async getPlatformLlms(): Promise<PlatformLlmEntryResponse[]> {
    return httpClient.get<PlatformLlmEntryResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/admin/platform-llms/`);
  },

  async updatePlatformLlms(
    purpose: AgentLlmPurpose,
    data: PlatformLlmBindingsRequest,
  ): Promise<PlatformLlmEntryResponse[]> {
    return httpClient.put<PlatformLlmEntryResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/admin/platform-llms/${purpose}`,
      data,
    );
  },

  // 404 when the purpose had no chain — the caller treats it as already clear.
  async deletePlatformLlms(purpose: AgentLlmPurpose): Promise<void> {
    return httpClient.delete<void>(`${API.ENDPOINTS.CONTROL_API}/manage/admin/platform-llms/${purpose}`);
  },

  async refreshLlmProviderModels(id: string): Promise<RefreshModelsResponse> {
    return httpClient.post<RefreshModelsResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}/refresh-models`, {});
  },

  // Model registry — models persist across refreshes with an availability status.
  async getLlmProviderModels(id: string): Promise<LlmProviderModelResponse[]> {
    return httpClient.get<LlmProviderModelResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}/models/`);
  },

  async updateLlmProviderModelExtraBody(id: string, data: UpdateModelExtraBodyRequest): Promise<LlmProviderModelResponse> {
    return httpClient.put<LlmProviderModelResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/llm-providers/${id}/models/extra-body`, data);
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
