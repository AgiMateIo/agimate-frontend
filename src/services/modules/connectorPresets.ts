// modules/connectorPresets.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type { ConnectorPresetResponse } from '@/types';

export interface ConnectorPresetFilters {
  search?: string;
  connectorCode?: string;
  category?: string;
  jurisdiction?: string;
}

const PATH = `${API.ENDPOINTS.CONTROL_API}/manage/connector-presets`;

export const connectorPresetsApi = {
  // A plain array, already ordered by the backend; the catalogue is dozens of
  // rows, so there is no paging. Filters exist for a growing catalogue; the
  // picker cuts the loaded list itself.
  async getConnectorPresets(params?: ConnectorPresetFilters): Promise<ConnectorPresetResponse[]> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) query.set(key, value);
    }
    const suffix = query.toString();
    return httpClient.get<ConnectorPresetResponse[]>(`${PATH}/${suffix ? `?${suffix}` : ''}`);
  },

  async getConnectorPreset(code: string): Promise<ConnectorPresetResponse> {
    return httpClient.get<ConnectorPresetResponse>(`${PATH}/${encodeURIComponent(code)}`);
  },
};
