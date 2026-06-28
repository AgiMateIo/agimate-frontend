'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PagedResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';

interface UseAutoRefreshPagedDataOptions {
  defaultPageSize?: number;
  defaultError?: string;
}

/**
 * Owns the shared auto-refresh + pagination + polling scaffolding used by the
 * connector log/job tabs:
 *  - paged data, loading and error state
 *  - page / pageSize state (changing pageSize resets page to 0)
 *  - an initial (non-silent) load
 *  - a polling effect driven by `refreshInterval` (seconds; null = off) that
 *    refetches silently
 *  - a manual `refresh()` (non-silent)
 *
 * The fetch logic mirrors the original per-tab `fetchData(silent)`:
 *  - non-silent: sets loading + clears error up front, clears loading at the end
 *  - on success: stores the data (and clears error when silent)
 *  - on error: sets the error only when non-silent
 *
 * The fetcher is read through a ref so the refetch identity depends only on
 * [page, pageSize] — callers can pass an inline fetcher without causing a loop.
 */
export function useAutoRefreshPagedData<T>(
  fetcher: (params: { page: number; size: number }) => Promise<PagedResponse<T>>,
  opts: UseAutoRefreshPagedDataOptions = {},
) {
  const { defaultPageSize = 20, defaultError = 'Failed to load data' } = opts;

  const [pagedData, setPagedData] = useState<PagedResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  // Keep the latest fetcher / default error without making them deps of fetchData.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const defaultErrorRef = useRef(defaultError);
  defaultErrorRef.current = defaultError;

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await fetcherRef.current({ page, size: pageSize });
      setPagedData(data);
      if (silent) setError('');
    } catch (err) {
      if (!silent) {
        setError(getErrorMessage(err, defaultErrorRef.current));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, pageSize]);

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

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPage(0);
  }, []);

  const refresh = useCallback(() => fetchData(false), [fetchData]);

  return {
    pagedData,
    content: pagedData?.content ?? [],
    totalElements: pagedData?.totalElements ?? 0,
    totalPages: pagedData?.totalPages ?? 0,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    refreshInterval,
    setRefreshInterval,
    refresh,
  };
}
