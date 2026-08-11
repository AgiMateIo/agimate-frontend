import {
  keepPreviousData,
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type { PagedResponse, RunResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { logKeys } from './logs';

export const runKeys = {
  all: ['runs'] as const,
  detail: (runId: string) => [...runKeys.all, 'detail', runId] as const,
  summary: (runId: string) => [...runKeys.detail(runId), 'summary'] as const,
  turns: (runId: string, page: number, size: number) =>
    [...runKeys.detail(runId), 'turns', page, size] as const,
  prompt: (runId: string) => [...runKeys.detail(runId), 'prompt'] as const,
};

// There is no `GET /manage/runs/{id}`: the row exists only inside a page of the
// list. So a list hands the row it already has to the detail page before
// navigating, and the page reads it back from here — a deep link then costs no
// request at all.
export function primeRunSummary(queryClient: QueryClient, run: RunResponse) {
  queryClient.setQueryData(runKeys.summary(run.id), run);
}

// The row for one run, if anything in the cache already holds it: what a list
// primed on its way out, or any run list still cached (browser back, the list
// page behind this one).
function lookupCachedRun(queryClient: QueryClient, runId: string): RunResponse | null {
  const primed = queryClient.getQueryData<RunResponse>(runKeys.summary(runId));
  if (primed) return primed;

  for (const [, data] of queryClient.getQueriesData<PagedResponse<RunResponse>>({
    queryKey: logKeys.all,
  })) {
    const hit = data?.content?.find(
      (row) => row?.id === runId && typeof row === 'object' && 'triggerLogId' in row,
    );
    if (hit) return hit;
  }
  return null;
}

// The run's own row: status, times, payload, result, what it spent. Free when a
// list primed it or still holds it; fetched by id otherwise, so a deep link
// shows the same page as a click from the list. A 404 (unknown run, or someone
// else's — deliberately indistinguishable) leaves `run` null and `error` set.
export function useRunSummary(runId: string) {
  const queryClient = useQueryClient();
  const cached = lookupCachedRun(queryClient, runId);

  const query = useQuery({
    queryKey: runKeys.summary(runId),
    queryFn: () => apiService.getRun(runId),
    initialData: cached ?? undefined,
    // Everything but the status of a live run is written once; the status is
    // re-read by reopening the run from a list, which has its own refresh.
    staleTime: 60_000,
  });

  return {
    run: query.data ?? null,
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error, '') : '',
  };
}

// The journal of one run. Both of these are read-only history of a finished (or
// finishing) run, so no polling: the detail view is opened from a list that has
// its own refresh, and re-opening a live run is the way to see more turns.
export const runTurnsOptions = (runId: string, page: number, size: number) =>
  queryOptions({
    queryKey: runKeys.turns(runId, page, size),
    queryFn: () => apiService.getRunTurns(runId, { page, size }),
    placeholderData: keepPreviousData,
  });

export const runPromptOptions = (runId: string) =>
  queryOptions({
    queryKey: runKeys.prompt(runId),
    queryFn: () => apiService.getRunPrompt(runId),
    // The snapshot is written once and never changes.
    staleTime: Infinity,
  });

export function useRunTurnsQuery(runId: string, page: number, size: number) {
  return useQuery(runTurnsOptions(runId, page, size));
}

// Only fetched once the snapshot tab is opened — it is the heaviest thing the
// detail view can ask for (system blocks plus the whole session history), and
// the tab strip mounts nothing but the active tab.
export function useRunPromptQuery(runId: string) {
  return useQuery(runPromptOptions(runId));
}
