import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { ConnectorCatalogEntry } from '@/types';

export const connectorKeys = {
  all: ['connectors'] as const,
  catalog: () => [...connectorKeys.all, 'catalog'] as const,
  search: (search: string, page: number) =>
    [...connectorKeys.all, 'search', search, page] as const,
};

// The connector catalog is read-only reference data — cache it for the session.
export const connectorCatalogOptions = () =>
  queryOptions({
    queryKey: connectorKeys.catalog(),
    queryFn: () => apiService.getConnectorCatalog(),
    staleTime: Infinity,
  });

// Connector types that hold credentials ("integration platforms") — the
// subset offered when creating a connection.
export const integrationPlatformsOptions = () =>
  queryOptions({
    ...connectorCatalogOptions(),
    select: (catalog: ConnectorCatalogEntry[]) =>
      catalog.filter((c) => c.integrationMeta),
  });

export const connectorSearchOptions = (search: string, page: number) =>
  queryOptions({
    queryKey: connectorKeys.search(search, page),
    queryFn: () =>
      apiService.getConnectors({ search: search || undefined, page, size: 20 }),
  });

export function useConnectorCatalogQuery() {
  return useSuspenseQuery(connectorCatalogOptions());
}

export function useIntegrationPlatformsQuery() {
  return useSuspenseQuery(integrationPlatformsOptions());
}

export function useConnectorSearchQuery(search: string, page: number) {
  return useSuspenseQuery(connectorSearchOptions(search, page));
}
