'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExclamationTriangleIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { Link } from '@/i18n/navigation';
import type { RunResponse, RunStatus } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { RefreshControls } from '@/components/ui/RefreshControls';
import { Pagination } from '@/components/ui/Pagination';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { Select } from '@/components/ui/FormField';
import { usePagedLogsQuery } from '@/queries/logs';
import { primeRunSummary } from '@/queries/runs';
import { connectionsListOptions } from '@/queries/connections';
import { agentConnectionsOptions, allAgentsOptions } from '@/queries/agents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { RunStatusBadge, STOPPABLE } from './RunStatusBadge';
import { formatTokens, useUsageTooltip } from './RunBlocks';

type StatusFilter = 'ALL' | RunStatus;

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'ENQUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED'];

const STATUS_LABEL_KEY = {
  ENQUEUED: 'statusEnqueued',
  RUNNING: 'statusRunning',
  DONE: 'statusDone',
  FAILED: 'statusFailed',
  CANCELLED: 'statusCancelled',
} as const satisfies Record<RunStatus, string>;

// Which triggers were received and how each run went. One row = one agent's run
// of one trigger (the shared event may have fanned out to other agents too).
//
// Standalone on /dashboard/runs, where the agent is one more filter; scoped to
// one agent on the agent's Runs section, where the connector/connection
// selectors then offer only that agent's bindings. `sessionId` narrows it to one
// conversation — it arrives from the URL (the chat links here) and has no
// control of its own, so it announces itself in a notice with a way out.
export default function RunsList({
  agentId,
  sessionId,
  clearSessionHref,
}: {
  agentId?: string;
  sessionId?: string;
  // Where "show all runs" leads — the same list without the conversation, on
  // whichever of the two routes this one is.
  clearSessionHref?: string;
}) {
  const t = useTranslations('Runs');
  const usageTooltip = useUsageTooltip();
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Runs a stop was asked for. Ids stay in here after the request lands: the
  // row keeps its RUNNING status until the run reaches its next seam, and the
  // button has to read "stopping" for that whole stretch. Terminal rows drop
  // the button entirely, so the set never needs cleaning up.
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());
  const [stopError, setStopError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [connectorFilter, setConnectorFilter] = useState('ALL');
  const [connectionFilter, setConnectionFilter] = useState('ALL');

  // Resolve connectionId → human-readable name.
  const { data: connections } = useQuery(connectionsListOptions());
  const connectionsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of connections ?? []) {
      map.set(c.id, c.name || c.fullCode || c.id);
    }
    return map;
  }, [connections]);

  // The agent selector only exists unscoped — inside an agent the answer is
  // already fixed.
  const { data: agents } = useQuery({ ...allAgentsOptions(), enabled: !agentId });

  // Filter selectors need exact values: the agent's bound connections when
  // scoped, otherwise every connection of the user.
  const { data: agentConnections } = useQuery({
    ...agentConnectionsOptions(agentId ?? ''),
    enabled: !!agentId,
  });
  const filterSource = useMemo(
    () =>
      agentId
        ? (agentConnections ?? []).map((c) => ({
            connectionId: c.connectionId,
            connectorCode: c.connectorCode,
            label: c.name || c.fullCode || c.connectionId,
          }))
        : (connections ?? []).map((c) => ({
            connectionId: c.id,
            connectorCode: c.connectorCode,
            label: c.name || c.fullCode || c.id,
          })),
    [agentId, agentConnections, connections],
  );
  const connectorOptions = useMemo(
    () => [...new Set(filterSource.map((c) => c.connectorCode))].sort(),
    [filterSource],
  );
  const connectionOptions = useMemo(() => {
    const scoped =
      connectorFilter === 'ALL'
        ? filterSource
        : filterSource.filter((c) => c.connectorCode === connectorFilter);
    return [...new Map(scoped.map((c) => [c.connectionId, c])).values()];
  }, [filterSource, connectorFilter]);

  const {
    content: runs,
    totalElements,
    totalPages,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    refreshInterval,
    setRefreshInterval,
    refresh,
  } = usePagedLogsQuery(
    'runs',
    [
      agentId ?? agentFilter,
      sessionId ?? 'all',
      debouncedSearch,
      statusFilter,
      connectorFilter,
      connectionFilter,
    ],
    (params) =>
      apiService.getRuns({
        ...params,
        agentId: agentId ?? (agentFilter === 'ALL' ? undefined : agentFilter),
        sessionId,
        name: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        connectorCode: connectorFilter === 'ALL' ? undefined : connectorFilter,
        connectionId: connectionFilter === 'ALL' ? undefined : connectionFilter,
      }),
    { defaultError: t('loadRunsError') },
  );

  const filtersActive =
    statusFilter !== 'ALL' ||
    agentFilter !== 'ALL' ||
    connectorFilter !== 'ALL' ||
    connectionFilter !== 'ALL';
  const anyFilterSet = filtersActive || debouncedSearch !== '';

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const changeStatus = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(0);
  };
  const changeAgent = (value: string) => {
    setAgentFilter(value);
    setPage(0);
  };
  const changeConnector = (value: string) => {
    setConnectorFilter(value);
    // The connection selector is scoped to the chosen connector — a previously
    // picked connection may no longer belong to it.
    setConnectionFilter('ALL');
    setPage(0);
  };
  const changeConnection = (value: string) => {
    setConnectionFilter(value);
    setPage(0);
  };

  // No confirmation: cancelling destroys nothing, it only stops the run from
  // doing anything new. Whatever it already did (a message sent, a file
  // written) stays — the run says so itself in its closing message.
  const handleStop = async (runId: string) => {
    setStoppingIds((prev) => new Set(prev).add(runId));
    setStopError('');
    try {
      await apiService.cancelRun(runId);
      // The status won't have changed yet; refresh so a run that was merely
      // queued (it never starts at all) drops out of the live states quickly.
      refresh();
    } catch (err) {
      setStoppingIds((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
      setStopError(getErrorMessage(err, t('stopRunError')));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // The detail page has no endpoint of its own for this row — hand it over
  // before navigating, so it can show the outcome next to the transcript.
  const openRun = (run: RunResponse) => primeRunSummary(queryClient, run);

  const toolbar = (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <SearchToolbar
          value={search}
          onChange={changeSearch}
          placeholder={t('searchPlaceholder')}
          size="sm"
          filtersActive={filtersActive}
          filters={
            <div className="space-y-2">
              <FilterRow label={t('status')}>
                {STATUS_FILTERS.map((value) => (
                  <FilterPill
                    key={value}
                    active={statusFilter === value}
                    onClick={() => changeStatus(value)}
                  >
                    {value === 'ALL' ? t('filterAll') : t(STATUS_LABEL_KEY[value])}
                  </FilterPill>
                ))}
              </FilterRow>
              <div className="flex items-center gap-2 flex-wrap">
                {!agentId && (
                  <div className="w-52">
                    <Select value={agentFilter} onChange={(e) => changeAgent(e.target.value)}>
                      <option value="ALL">{t('allAgents')}</option>
                      {(agents?.content ?? []).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="w-52">
                  <Select value={connectorFilter} onChange={(e) => changeConnector(e.target.value)}>
                    <option value="ALL">{t('allConnectors')}</option>
                    {connectorOptions.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-52">
                  <Select
                    value={connectionFilter}
                    onChange={(e) => changeConnection(e.target.value)}
                    disabled={connectionOptions.length === 0}
                  >
                    <option value="ALL">{t('allConnections')}</option>
                    {connectionOptions.map((c) => (
                      <option key={c.connectionId} value={c.connectionId}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          }
        />
      </div>
      <RefreshControls value={refreshInterval} onChange={setRefreshInterval} onRefresh={refresh} />
    </div>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {toolbar}
        <ErrorAlert>{error}</ErrorAlert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessionId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <span>{t('sessionScopeNotice')}</span>
          {clearSessionHref && (
            <Link
              href={clearSessionHref}
              className="ml-auto flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              {t('showAllRuns')}
            </Link>
          )}
        </div>
      )}
      {toolbar}
      {stopError && <ErrorAlert>{stopError}</ErrorAlert>}
      {loading ? (
        <div className="text-center py-12 text-muted">{t('loadingRuns')}</div>
      ) : runs.length === 0 ? (
        <div className="text-center py-12 text-muted">
          {anyFilterSet ? t('noRunsFiltered') : t('noRuns')}
        </div>
      ) : (
        <>
          <div className="text-sm text-muted">{t('runsTotal', { count: totalElements })}</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted w-32 whitespace-nowrap">{t('createdAt')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('triggerName')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted w-full">{t('triggerInput')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('status')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted whitespace-nowrap">{t('lastActivityAt')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('resultOrError')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const rowColor =
                    run.status === 'FAILED'
                      ? 'bg-error/5 hover:bg-error/10'
                      : run.status === 'DONE'
                        ? 'bg-success/5 hover:bg-success/10'
                        : 'hover:bg-surface-secondary';
                  const connectionName = connectionsById.get(run.connectionId);

                  return (
                    <tr key={run.id} className={`border-b border-border last:border-b-0 transition-colors ${rowColor}`}>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted" title={formatDateTimeFull(run.createdAt)}>
                          {formatDateTimeShort(run.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {/* The name opens the run: its turns, the tool calls in
                            them and the message list it started from. */}
                        <Link
                          href={
                            agentId
                              ? `/dashboard/agents/${agentId}/runs/${run.id}`
                              : `/dashboard/runs/${run.id}`
                          }
                          onClick={() => openRun(run)}
                          className="text-left text-sm font-medium text-foreground font-mono transition-colors hover:text-accent"
                          title={[
                            run.occurredAt && `${t('occurredAt')}: ${formatDateTimeFull(run.occurredAt)}`,
                            `trigger: ${run.externalId}`,
                            run.sessionId && `session: ${run.sessionId}`,
                          ].filter(Boolean).join('\n')}
                        >
                          {run.name}
                        </Link>
                        {/* The one visible consequence of a broken journal:
                            later runs of this session don't see this one, so
                            the agent doesn't remember it. */}
                        {run.turnsIntact === false && (
                          <div
                            className="mt-0.5 flex items-center gap-1 text-xs text-warning"
                            title={t('turnsNotIntactHint')}
                          >
                            <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                            {t('turnsNotIntact')}
                          </div>
                        )}
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted" title={run.connectionId}>
                          <span className="font-mono text-muted/70">{run.connectorCode}</span>
                          {connectionName && (
                            <>
                              <span className="text-muted/50">&ndash;</span>
                              <span className="truncate max-w-[160px]">{connectionName}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {run.input && Object.keys(run.input).length > 0 ? (
                          <div>
                            <button
                              onClick={() => toggleExpand(`input-${run.id}`)}
                              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                            >
                              <span className="max-w-[340px] truncate font-mono">
                                {JSON.stringify(run.input)}
                              </span>
                              <span className="shrink-0">{expandedIds.has(`input-${run.id}`) ? '▲' : '▼'}</span>
                            </button>
                            {expandedIds.has(`input-${run.id}`) && (
                              <pre className="mt-2 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto max-w-xl">
                                {JSON.stringify(run.input, null, 2)}
                              </pre>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted text-xs">&mdash;</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <RunStatusBadge status={run.status} />
                        {/* What the run cost, where the eye already goes for its
                            outcome — this is the column that answers "which run
                            was expensive" without opening any of them. */}
                        {run.usage && (
                          <div
                            className="mt-1 text-xs whitespace-nowrap text-muted/70"
                            title={usageTooltip(run.usage)}
                          >
                            {t('usageTotal', { value: formatTokens(run.usage.totalTokens) })}
                          </div>
                        )}
                        {STOPPABLE.includes(run.status) && (
                          <button
                            type="button"
                            onClick={() => handleStop(run.id)}
                            disabled={stoppingIds.has(run.id)}
                            className="mt-1.5 flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs whitespace-nowrap text-muted transition-colors hover:border-error/50 hover:text-error disabled:cursor-default disabled:opacity-60 disabled:hover:border-border disabled:hover:text-muted"
                          >
                            <StopIcon className="h-3.5 w-3.5 shrink-0" />
                            {stoppingIds.has(run.id) ? t('stoppingRun') : t('stopRun')}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-sm text-muted"
                          title={run.lastActivityAt ? formatDateTimeFull(run.lastActivityAt) : undefined}
                        >
                          {run.lastActivityAt ? formatDateTimeShort(run.lastActivityAt) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {run.error ? (
                          <span className="text-sm text-error">{run.error}</span>
                        ) : run.result !== null ? (
                          <div>
                            <button
                              onClick={() => toggleExpand(`result-${run.id}`)}
                              className="flex items-center gap-1 text-xs text-success hover:text-success/80 font-medium transition-colors"
                            >
                              <span className="max-w-[200px] truncate">{run.result}</span>
                              <span className="shrink-0">{expandedIds.has(`result-${run.id}`) ? '▲' : '▼'}</span>
                            </button>
                            {expandedIds.has(`result-${run.id}`) && (
                              <pre className="mt-2 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto max-w-md whitespace-pre-wrap">
                                {run.result}
                              </pre>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted text-xs">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            rowsPerPageLabel={t('rowsPerPage')}
          />
        </>
      )}
    </div>
  );
}
