// modules/connectors.ts
import { httpClient, buildPagedQuery } from '../httpClient';
import { API } from '@/config/constants';
import type {
  PagedResponse,
  ConnectorCatalogEntry,
} from '@/types';

export const connectorsApi = {
  // ========== CONNECTOR CATALOG ==========

  async getConnectorCatalog(): Promise<ConnectorCatalogEntry[]> {
    // Backend returns a paginated response; fetch a large page and unwrap content.
    // Tolerates legacy array responses for backwards compatibility.
    const result = await httpClient.get<PagedResponse<ConnectorCatalogEntry> | ConnectorCatalogEntry[]>(
      `${API.ENDPOINTS.CONTROL_API}/manage/connectors/?size=200`
    );
    return Array.isArray(result) ? result : result.content;
  },

  async getConnectors(params?: {
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<ConnectorCatalogEntry>> {
    const query = buildPagedQuery({ search: params?.search }, params);
    return httpClient.get<PagedResponse<ConnectorCatalogEntry>>(
      `${API.ENDPOINTS.CONTROL_API}/manage/connectors/?${query}`
    );
  },

  async getConnector(code: string): Promise<ConnectorCatalogEntry> {
    return httpClient.get<ConnectorCatalogEntry>(`${API.ENDPOINTS.CONTROL_API}/manage/connectors/${encodeURIComponent(code)}`);
  },
};
