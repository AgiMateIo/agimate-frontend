// modules/taxonomy.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type { TaxonomyResponse } from '@/types';

export const taxonomyApi = {
  // The catalog dictionary: sections and tag groups with their labels. Stable
  // between releases — cached for the session by the query layer.
  async getTaxonomy(): Promise<TaxonomyResponse> {
    return httpClient.get<TaxonomyResponse>(`${API.ENDPOINTS.CONTROL_API}/manage/taxonomy/`);
  },
};
