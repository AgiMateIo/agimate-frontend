import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { PagedResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';

export const logKeys = {
  all: ['logs'] as const,
  triggerProbe: () => [...logKeys.all, 'trigger-probe'] as const,
};

// Minting a probe code for the "send me a test event" dialog. Never cached and
// never retried: each opening must get its own code, and a failure to issue one
// is the answer the dialog shows rather than something to retry behind the
// user's back.
export function useTriggerProbeQuery() {
  return useQuery({
    queryKey: logKeys.triggerProbe(),
    // Always block delivery: the test event is logged but never wakes an agent.
    queryFn: () => apiService.issueTriggerLogProbe(true),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    // The user has already pasted this code into the system under test. Minting
    // a replacement on reconnect would leave them waiting on a code the dialog
    // has stopped matching against, and the wait would end as "expired".
    refetchOnReconnect: false,
  });
}

/**
 * React Query replacement for the old hand-rolled auto-refresh scaffolding
 * (useAutoRefreshPagedData): paged data + page/pageSize state + a polling
 * interval (seconds; null = off) + manual refresh.
 *
 * `filters` become part of the query key — include every value the fetcher
 * closes over, and reset the page at the call site when they change.
 * `keepPreviousData` keeps the current rows visible while the next page or a
 * background refresh loads, matching the old silent-refetch behaviour.
 */
export function usePagedLogsQuery<T>(
  scope: string,
  filters: readonly unknown[],
  fetcher: (params: { page: number; size: number }) => Promise<PagedResponse<T>>,
  opts: { defaultPageSize?: number; defaultError?: string } = {},
) {
  const { defaultPageSize = 20, defaultError = 'Failed to load data' } = opts;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  const query = useQuery({
    queryKey: [...logKeys.all, scope, ...filters, page, pageSize],
    queryFn: () => fetcher({ page, size: pageSize }),
    refetchInterval: refreshInterval ? refreshInterval * 1000 : false,
    placeholderData: keepPreviousData,
  });

  const pagedData = query.data ?? null;

  return {
    pagedData,
    content: pagedData?.content ?? [],
    totalElements: pagedData?.totalElements ?? 0,
    totalPages: pagedData?.totalPages ?? 0,
    loading: query.isPending,
    // Background-refresh failures keep showing stale rows (old silent-refresh
    // semantics); surface the error only when nothing ever loaded.
    error:
      query.error && !query.data
        ? getErrorMessage(query.error, defaultError)
        : '',
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(0);
    },
    refreshInterval,
    setRefreshInterval,
    refresh: () => query.refetch(),
  };
}
