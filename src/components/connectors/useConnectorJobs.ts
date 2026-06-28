'use client';

import { useState, useEffect, useCallback } from 'react';
import apiService from '@/services/api';
import { ConnectorJobResponse, ConnectorJobKind, PagedResponse } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/utils/error';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Owns the connector-jobs paged fetch: filters (kind + debounced connector code),
 * pagination, and the silent auto-refresh interval. `fetchData` is exposed so
 * callers can re-fetch after row actions (run-now / pause / resume / delete).
 */
export function useConnectorJobs() {
  const [pagedData, setPagedData] = useState<PagedResponse<ConnectorJobResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [kindFilter, setKindFilter] = useState<ConnectorJobKind | ''>('');
  const [codeFilter, setCodeFilter] = useState('');
  const debouncedCodeFilter = useDebouncedValue(codeFilter.trim(), 300);

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await apiService.getConnectorJobs({
        connectorCode: debouncedCodeFilter || undefined,
        kind: kindFilter || undefined,
        page,
        size: pageSize,
      });
      setPagedData(data);
      if (silent) setError('');
    } catch (err) {
      if (!silent) {
        setError(getErrorMessage(err, 'Failed to load connector jobs'));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, pageSize, kindFilter, debouncedCodeFilter]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval === null) return;
    const intervalId = setInterval(() => {
      fetchData(true);
    }, refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handleCodeFilterChange = (value: string) => {
    setCodeFilter(value);
    setPage(0);
  };

  const handleKindFilterChange = (value: ConnectorJobKind | '') => {
    setKindFilter(value);
    setPage(0);
  };

  return {
    pagedData,
    loading,
    error,
    page,
    setPage,
    pageSize,
    handlePageSizeChange,
    kindFilter,
    handleKindFilterChange,
    codeFilter,
    handleCodeFilterChange,
    debouncedCodeFilter,
    refreshInterval,
    setRefreshInterval,
    fetchData,
  };
}
