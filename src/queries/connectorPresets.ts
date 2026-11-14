import { queryOptions, useQuery } from '@tanstack/react-query';
import apiService, { ApiError } from '@/services/api';
import { presetsByPopularity } from '@/utils/presetOrder';
import type { ConnectorPresetResponse } from '@/types';

export const connectorPresetKeys = {
  all: ['connector-presets'] as const,
  list: () => [...connectorPresetKeys.all, 'list'] as const,
  detail: (code: string) => [...connectorPresetKeys.all, 'detail', code] as const,
};

// Reference data: it changes with a backend seed, not with anything the user
// does. The whole catalogue arrives in one request; the picker filters it.
export const connectorPresetsOptions = () =>
  queryOptions({
    queryKey: connectorPresetKeys.list(),
    queryFn: () => apiService.getConnectorPresets(),
    select: presetsByPopularity,
    staleTime: 5 * 60 * 1000,
  });

export const connectorPresetOptions = (code: string) =>
  queryOptions({
    queryKey: connectorPresetKeys.detail(code),
    // A missing preset is a state of the page, not a failed request: 404
    // resolves to null so the deep-link screen can offer the manual form
    // instead of falling into the error boundary.
    queryFn: async (): Promise<ConnectorPresetResponse | null> => {
      try {
        return await apiService.getConnectorPreset(code);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

export function useConnectorPresetsQuery() {
  return useQuery(connectorPresetsOptions());
}
