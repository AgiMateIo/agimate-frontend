'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { StopIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import type { TriggerRunStatus } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { RefreshControls } from '@/components/ui/RefreshControls';
import { Pagination } from '@/components/ui/Pagination';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { Select } from '@/components/ui/FormField';
import { usePagedLogsQuery } from '@/queries/logs';
import { connectionsListOptions } from '@/queries/connections';
import { agentConnectionsOptions } from '@/queries/agents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';

type StatusFilter = 'ALL' | TriggerRunStatus;

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'ENQUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED'];

// The two statuses a run can still be stopped from. Everything else has already
// ended — cancelling those isn't an error, just pointless, so no button.
const STOPPABLE: TriggerRunStatus[] = ['ENQUEUED', 'RUNNING'];

const STATUS_BADGE = {
  ENQUEUED: { className: 'bg-muted/10 text-muted', labelKey: 'runStatusEnqueued' },
  RUNNING: { className: 'bg-accent/10 text-accent animate-pulse', labelKey: 'runStatusRunning' },
  DONE: { className: 'bg-success/10 text-success', labelKey: 'runStatusDone' },
  FAILED: { className: 'bg-error/10 text-error', labelKey: 'runStatusFailed' },
  CANCELLED: { className: 'bg-muted/10 text-muted', labelKey: 'runStatusCancelled' },
} as const satisfies Record<TriggerRunStatus, { className: string; labelKey: string }>;

// The agent page's Triggers tab: which triggers this agent received and how
// each run went. One row = one agent's run of one trigger (the shared event
// may have fanned out to other agents too).
export default function AgentTriggerRunsTab({ agentId }: { agentId: string }) {
  const t = useTranslations('Connectors');
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

  // Filter selectors need exact values — the agent's bound connections.
  const { data: agentConnections } = useQuery(agentConnectionsOptions(agentId));
  const connectorOptions = useMemo(
    () => [...new Set((agentConnections ?? []).map((c) => c.connectorCode))].sort(),
    [agentConnections],
  );
  const connectionOptions = useMemo(() => {
    const scoped = (agentConnections ?? []).filter(
      (c) => connectorFilter === 'ALL' || c.connectorCode === connectorFilter,
    );
    return [
      ...new Map(
        scoped.map((c) => [c.connectionId, { connectionId: c.connectionId, label: c.name || c.fullCode || c.connectionId }]),
      ).values(),
    ];
  }, [agentConnections, connectorFilter]);

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
    'trigger-runs',
    [agentId, debouncedSearch, statusFilter, connectorFilter, connectionFilter],
    (params) =>
      apiService.getTriggerLogAgentRuns({
        ...params,
        agentId,
        name: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        connectorCode: connectorFilter === 'ALL' ? undefined : connectorFilter,
        connectionId: connectionFilter === 'ALL' ? undefined : connectionFilter,
      }),
    { defaultError: t('loadTriggerLogsError') },
  );

  const filtersActive =
    statusFilter !== 'ALL' || connectorFilter !== 'ALL' || connectionFilter !== 'ALL';
  const anyFilterSet = filtersActive || debouncedSearch !== '';

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const changeStatus = (value: StatusFilter) => {
    setStatusFilter(value);
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
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toolbar = (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <SearchToolbar
          value={search}
          onChange={changeSearch}
          placeholder={t('searchTriggersPlaceholder')}
          size="sm"
          filtersActive={filtersActive}
          filters={
            <div className="space-y-2">
              <FilterRow label={t('status')}>
                {STATUS_FILTERS.map((value) => (
                  <FilterPill key={value} active={statusFilter === value} onClick={() => changeStatus(value)}>
                    {value === 'ALL' ? t('filterAll') : t(STATUS_BADGE[value].labelKey)}
                  </FilterPill>
                ))}
              </FilterRow>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-52">
                  <Select value={connectorFilter} onChange={(e) => changeConnector(e.target.value)}>
                    <option value="ALL">{t('allConnectors')}</option>
                    {connectorOptions.map((code) => (
                      <option key={code} value={code}>{code}</option>
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
                      <option key={c.connectionId} value={c.connectionId}>{c.label}</option>
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

  const pagination = (
    <Pagination
      page={page}
      pageSize={pageSize}
      totalElements={totalElements}
      totalPages={totalPages}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      rowsPerPageLabel={t('rowsPerPage')}
    />
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
      {toolbar}
      {stopError && <ErrorAlert>{stopError}</ErrorAlert>}
      {loading ? (
        <div className="text-center py-12 text-muted">{t('loadingTriggerLogs')}</div>
      ) : runs.length === 0 ? (
        <div className="text-center py-12 text-muted">
          {anyFilterSet ? t('noTriggerRunsFiltered') : t('noTriggerRuns')}
        </div>
      ) : (
        <>
          <div className="text-sm text-muted">{t('triggerRunsTotal', { count: totalElements })}</div>
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
                  const badge = STATUS_BADGE[run.status] ?? STATUS_BADGE.CANCELLED;
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
                        <div
                          className="text-sm font-medium text-foreground font-mono"
                          title={[
                            run.occurredAt && `${t('occurredAt')}: ${formatDateTimeFull(run.occurredAt)}`,
                            `trigger: ${run.externalId}`,
                            run.sessionId && `session: ${run.sessionId}`,
                          ].filter(Boolean).join('\n')}
                        >
                          {run.name}
                        </div>
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
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}>
                          {t(badge.labelKey)}
                        </span>
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
                              <span className="max-w-[200px] truncate">
                                {run.result}
                              </span>
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
          {pagination}
        </>
      )}
    </div>
  );
}
