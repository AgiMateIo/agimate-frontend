import { useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { ConnectorCatalogEntry } from '@/types';

export const connectorKeys = {
  all: ['connectors'] as const,
  catalog: () => [...connectorKeys.all, 'catalog'] as const,
};

// The connector catalog is read-only reference data — cache it for the session.
export function useConnectorCatalogQuery<T = ConnectorCatalogEntry[]>(
  select?: (catalog: ConnectorCatalogEntry[]) => T
) {
  return useSuspenseQuery({
    queryKey: connectorKeys.catalog(),
    queryFn: () => apiService.getConnectorCatalog(),
    staleTime: Infinity,
    select,
  });
}

// Connector types that hold credentials ("integration platforms") — the
// subset offered when creating a connection.
export function useIntegrationPlatformsQuery() {
  return useConnectorCatalogQuery((catalog) =>
    catalog.filter((c) => c.integrationMeta)
  );
}
