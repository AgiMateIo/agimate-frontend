'use client';

import {
  keepPreviousData,
  useQueries,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import { parseBackendDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { agentsListOptions } from './agents';
import { agenticTeamsListOptions } from './agentic-teams';
import { appsListOptions } from './apps';
import { channelsListOptions } from './channels';
import { connectionsListOptions } from './connections';
import { llmProvidersListOptions } from './llm-providers';
import { skillsListOptions } from './skills';
import { webchatSessionsOptions } from './webchat';

export interface DashboardCount {
  // null until the first successful load (or after a failure).
  count: number | null;
  loading: boolean;
  // Backend message, '' when it carried none. null = no failure.
  error: string | null;
}

const toCount = <T,>(
  result: UseQueryResult<T>,
  size: (data: T) => number,
): DashboardCount => ({
  count: result.data !== undefined ? size(result.data) : null,
  loading: result.isPending,
  error: result.error ? getErrorMessage(result.error, '') : null,
});

/**
 * Every count the dashboard home renders, in one place.
 *
 * Deliberately non-suspense and per-card: the home is an overview, so one
 * failing list must degrade to one broken card rather than blank the page.
 * These are the domains' own list options, so the fetches double as a cache
 * warm-up for the pages behind the cards.
 */
export function useDashboardResources() {
  const [apps, agents, skills, connections, channels, teams, providers, sessions] =
    useQueries({
      queries: [
        appsListOptions(),
        agentsListOptions(),
        skillsListOptions('my'),
        connectionsListOptions(),
        channelsListOptions(),
        agenticTeamsListOptions(),
        llmProvidersListOptions(),
        webchatSessionsOptions(),
      ],
    });

  return {
    apps: toCount(apps, (d) => d.totalElements),
    agents: toCount(agents, (d) => d.totalElements),
    skills: toCount(skills, (d) => d.totalElements),
    connections: toCount(connections, (d) => d.length),
    channels: toCount(channels, (d) => d.length),
    teams: toCount(teams, (d) => d.length),
    llmProviders: toCount(providers, (d) => d.length),
    chatSessions: toCount(sessions, (d) => d.length),
    // Target for the "talk to an agent" action — chat is per-agent, there is no
    // standalone chat route.
    firstAgentId: agents.data?.content[0]?.id ?? null,
  };
}

export type DashboardResources = ReturnType<typeof useDashboardResources>;

export const dashboardKeys = {
  all: ['dashboard'] as const,
  attention: () => [...dashboardKeys.all, 'attention'] as const,
  jobScan: () => [...dashboardKeys.attention(), 'jobs'] as const,
  toolLogs: (kind: 'errors' | 'denied') =>
    [...dashboardKeys.attention(), 'tool-logs', kind] as const,
  webhookScan: () => [...dashboardKeys.attention(), 'webhooks'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
};

// Seconds → the shape React Query wants, so every dashboard query reacts to the
// one refresh selector in the work mode's header.
const toInterval = (seconds: number | null) =>
  seconds ? seconds * 1000 : (false as const);

// Neither connector jobs nor webhook deliveries can be filtered by outcome on
// the backend, so those signals are derived from a scanned page. When the page
// doesn't cover the whole set the signal is flagged `partial` and the UI says so
// rather than passing a truncated number off as a total.
const JOB_SCAN_SIZE = 100;
const WEBHOOK_SCAN_SIZE = 20;
const SAMPLE_SIZE = 5;

// Tool-use logs are pure history with no time filter on the backend, so a single
// old error would keep the warning lit forever. Only recent rows count as a
// signal. The window is deliberately coarse: backend timestamps carry no zone,
// so parsing skews it by the viewer's offset either way.
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

const isRecent = (createdAt: string): boolean =>
  Date.now() - parseBackendDate(createdAt).getTime() < RECENT_WINDOW_MS;

export type AttentionKind =
  | 'jobsFailed'
  | 'jobsPaused'
  | 'toolErrors'
  | 'toolDenied'
  | 'connectionsDisabled'
  | 'connectionsUnauthorized'
  | 'webhooksFailed';

export interface AttentionSignal {
  kind: AttentionKind;
  // null when a number would mislead: tool-use logs carry no time filter, so any
  // total counts all-time rows and says nothing about today. Those signals show
  // their newest rows instead.
  count: number | null;
  partial: boolean;
  // Newest occurrence, when the row type carries a usable timestamp.
  latestAt: string | null;
  samples: string[];
  href: string;
}

// One scan serves both the attention panel and the upcoming-runs list: same key,
// same options, so the two observers share a single request.
const jobScanOptions = (refreshSeconds: number | null) => ({
  queryKey: dashboardKeys.jobScan(),
  queryFn: () => apiService.getConnectorJobs({ size: JOB_SCAN_SIZE }),
  staleTime: 30_000,
  refetchInterval: toInterval(refreshSeconds),
});

const newest = (values: (string | null)[]): string | null =>
  values.filter((v): v is string => !!v).sort().at(-1) ?? null;

/**
 * Everything on the dashboard worth a second look: failing or paused connector
 * jobs, recent tool-call errors and policy denials, disabled connections and
 * failed webhook deliveries.
 *
 * Feeds both the work-mode panel and the dot on the mode switch, so the friendly
 * mode can't quietly hide a broken workspace.
 */
export function useAttentionSignals(refreshSeconds: number | null = null) {
  const [jobs, toolErrors, toolDenied, connections, webhooks] = useQueries({
    queries: [
      jobScanOptions(refreshSeconds),
      {
        queryKey: dashboardKeys.toolLogs('errors'),
        queryFn: () => apiService.getToolUseLogs({ status: 'ERROR', size: SAMPLE_SIZE }),
        staleTime: 30_000,
        refetchInterval: toInterval(refreshSeconds),
      },
      {
        queryKey: dashboardKeys.toolLogs('denied'),
        queryFn: () => apiService.getToolUseLogs({ accessEffect: 'DENY', size: SAMPLE_SIZE }),
        staleTime: 30_000,
        refetchInterval: toInterval(refreshSeconds),
      },
      // Same key as the connections count — one request serves both.
      connectionsListOptions(),
      {
        queryKey: dashboardKeys.webhookScan(),
        queryFn: () => apiService.getWebhookDeliveryLogs({ size: WEBHOOK_SCAN_SIZE }),
        staleTime: 30_000,
        refetchInterval: toInterval(refreshSeconds),
      },
    ],
  });

  const signals: AttentionSignal[] = [];

  const jobRows = jobs.data?.content ?? [];
  const jobsPartial = (jobs.data?.totalElements ?? 0) > jobRows.length;
  const jobLabel = (job: { name: string; connectorCode: string }) =>
    `${job.name} · ${job.connectorCode}`;

  const failedJobs = jobRows.filter((j) => j.lastError !== null);
  if (failedJobs.length > 0) {
    signals.push({
      kind: 'jobsFailed',
      count: failedJobs.length,
      partial: jobsPartial,
      latestAt: null,
      samples: failedJobs.slice(0, 3).map(jobLabel),
      href: '/dashboard/connector-jobs',
    });
  }

  const pausedJobs = jobRows.filter((j) => j.pausedAt !== null);
  if (pausedJobs.length > 0) {
    signals.push({
      kind: 'jobsPaused',
      count: pausedJobs.length,
      partial: jobsPartial,
      latestAt: newest(pausedJobs.map((j) => j.pausedAt)),
      samples: pausedJobs.slice(0, 3).map(jobLabel),
      href: '/dashboard/connector-jobs',
    });
  }

  const errorRows = (toolErrors.data?.content ?? []).filter((r) => isRecent(r.createdAt));
  if (errorRows.length > 0) {
    signals.push({
      kind: 'toolErrors',
      count: null,
      partial: false,
      latestAt: errorRows[0].createdAt,
      samples: errorRows.slice(0, 3).map((r) => `${r.name} · ${r.connectorCode ?? '—'}`),
      href: '/dashboard/tool-use-logs?status=ERROR',
    });
  }

  const deniedRows = (toolDenied.data?.content ?? []).filter((r) => isRecent(r.createdAt));
  if (deniedRows.length > 0) {
    signals.push({
      kind: 'toolDenied',
      count: null,
      partial: false,
      latestAt: deniedRows[0].createdAt,
      samples: deniedRows.slice(0, 3).map((r) => `${r.name} · ${r.connectorCode ?? '—'}`),
      href: '/dashboard/tool-use-logs?access=DENY',
    });
  }

  // Broken without anyone touching anything: an OAuth grant that was never
  // completed or has been revoked. The fix lives on the connection card.
  const unauthorized = (connections.data ?? []).filter((c) => c.authStatus !== 'AUTHORIZED');
  if (unauthorized.length > 0) {
    signals.push({
      kind: 'connectionsUnauthorized',
      count: unauthorized.length,
      partial: false,
      latestAt: null,
      samples: unauthorized.slice(0, 3).map((c) => c.name || c.fullCode),
      href: '/dashboard/connections',
    });
  }

  const disabled = (connections.data ?? []).filter((c) => !c.enabled);
  if (disabled.length > 0) {
    signals.push({
      kind: 'connectionsDisabled',
      count: disabled.length,
      partial: false,
      latestAt: null,
      samples: disabled.slice(0, 3).map((c) => c.name || c.fullCode),
      href: '/dashboard/connections',
    });
  }

  const deliveryRows = webhooks.data?.content ?? [];
  const failedDeliveries = deliveryRows.filter((d) => !d.success);
  if (failedDeliveries.length > 0) {
    signals.push({
      kind: 'webhooksFailed',
      count: failedDeliveries.length,
      partial: (webhooks.data?.totalElements ?? 0) > deliveryRows.length,
      latestAt: newest(failedDeliveries.map((d) => d.deliveredAt)),
      samples: failedDeliveries
        .slice(0, 3)
        .map((d) => `${d.responseStatusCode || '—'} · ${d.requestUrl}`),
      href: '/dashboard/agents/deliveries',
    });
  }

  const results = [jobs, toolErrors, toolDenied, connections, webhooks];
  const firstError = results.find((r) => r.error)?.error;

  return {
    signals,
    hasAlert: signals.length > 0,
    loading: results.some((r) => r.isPending),
    // Surfaced rather than swallowed: a failed check is not a clean workspace.
    error: firstError ? getErrorMessage(firstError, '') : null,
  };
}

const ACTIVITY_SIZE = 8;
const UPCOMING_SIZE = 5;

/** Newest tool calls across every agent — the work mode's "what just happened". */
export function useActivityFeed(refreshSeconds: number | null = null) {
  const query = useQuery({
    queryKey: dashboardKeys.activity(),
    queryFn: () => apiService.getToolUseLogs({ size: ACTIVITY_SIZE }),
    staleTime: 15_000,
    refetchInterval: toInterval(refreshSeconds),
    // Keep rows on screen while a background refresh lands, like the log tabs.
    placeholderData: keepPreviousData,
  });

  return {
    logs: query.data?.content ?? [],
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error, '') : null,
  };
}

/**
 * The next few scheduled connector runs. Reuses the attention scan, which the
 * backend already sorts by nextRunAt ascending; paused jobs are dropped because
 * their next run will not happen.
 */
export function useUpcomingJobs(refreshSeconds: number | null = null) {
  const query = useQuery(jobScanOptions(refreshSeconds));

  const jobs = (query.data?.content ?? [])
    .filter((j) => j.pausedAt === null && j.nextRunAt !== null)
    .slice(0, UPCOMING_SIZE);

  return {
    jobs,
    loading: query.isPending,
    error: query.error ? getErrorMessage(query.error, '') : null,
  };
}
