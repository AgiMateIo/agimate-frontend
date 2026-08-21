'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { ConnectorJobKind } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedLogsQuery } from '@/queries/logs';

/**
 * Connector-jobs paged fetch: filters (kind + debounced connector code) on top
 * of the shared auto-refresh paged query. `fetchData` is exposed so callers can
 * re-fetch after row actions (run-now / pause / resume / delete).
 */
export function useConnectorJobs() {
  const [kindFilter, setKindFilter] = useState<ConnectorJobKind | ''>('');
  const [codeFilter, setCodeFilter] = useState('');
  const debouncedCodeFilter = useDebouncedValue(codeFilter.trim());

  const paged = usePagedLogsQuery(
    'connector-jobs',
    [kindFilter, debouncedCodeFilter],
    ({ page, size }) =>
      apiService.getConnectorJobs({
        connectorCode: debouncedCodeFilter || undefined,
        kind: kindFilter || undefined,
        page,
        size,
      }),
    { defaultError: 'Failed to load connector jobs' },
  );

  const handleCodeFilterChange = (value: string) => {
    setCodeFilter(value);
    paged.setPage(0);
  };

  const handleKindFilterChange = (value: ConnectorJobKind | '') => {
    setKindFilter(value);
    paged.setPage(0);
  };

  return {
    pagedData: paged.pagedData,
    loading: paged.loading,
    error: paged.error,
    page: paged.page,
    setPage: paged.setPage,
    pageSize: paged.pageSize,
    handlePageSizeChange: paged.setPageSize,
    kindFilter,
    handleKindFilterChange,
    codeFilter,
    handleCodeFilterChange,
    debouncedCodeFilter,
    refreshInterval: paged.refreshInterval,
    setRefreshInterval: paged.setRefreshInterval,
    fetchData: () => paged.refresh(),
  };
}
