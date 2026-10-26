// modules/agentPresets.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  AdminAgentPresetRequest,
  AdminAgentPresetResponse,
  AgentPresetResponse,
  PresetCatalogLocale,
} from '@/types';

// The admin calls pick the catalog themselves, whatever the interface locale.
const catalog = (locale: PresetCatalogLocale) => ({ 'Accept-Language': locale });

export const agentPresetsApi = {
  // Role preset gallery for the agent creation wizard.
  // Returns a plain array, already sorted for display.
  async getAgentPresets(): Promise<AgentPresetResponse[]> {
    return httpClient.get<AgentPresetResponse[]>(`${API.ENDPOINTS.CONTROL_API}/manage/agent-presets/`);
  },

  // ADMIN only: every preset of one catalog, disabled ones included.
  async getAdminAgentPresets(locale: PresetCatalogLocale): Promise<AdminAgentPresetResponse[]> {
    return httpClient.get<AdminAgentPresetResponse[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/agent-presets/all/`,
      catalog(locale),
    );
  },

  async createAdminAgentPreset(
    locale: PresetCatalogLocale,
    data: AdminAgentPresetRequest,
  ): Promise<AdminAgentPresetResponse> {
    return httpClient.post<AdminAgentPresetResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/agent-presets/`,
      data,
      catalog(locale),
    );
  },

  async updateAdminAgentPreset(
    locale: PresetCatalogLocale,
    id: string,
    data: AdminAgentPresetRequest,
  ): Promise<AdminAgentPresetResponse> {
    return httpClient.patch<AdminAgentPresetResponse>(
      `${API.ENDPOINTS.CONTROL_API}/manage/agent-presets/${id}`,
      data,
      catalog(locale),
    );
  },
};
