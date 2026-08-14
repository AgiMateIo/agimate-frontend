'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon, StopIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { Link } from '@/i18n/navigation';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Tabs } from '@/components/ui/Tabs';
import { formatDateTimeFull } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import type { RunResponse } from '@/types';
import { RunStatusBadge, STOPPABLE } from './RunStatusBadge';
import RunTurnsList from './RunTurnsList';
import RunPromptView from './RunPromptView';
import { Collapsible, TextBlock, formatTokens, previewOf, useUsageTooltip } from './RunBlocks';

// The outcome of the run: status, times, how much work and how many tokens it
// took, the event payload, the result or the error — and a stop button while it
// is still alive.
function RunSummary({ run, runsHref }: { run: RunResponse; runsHref: string }) {
  const t = useTranslations('Runs');
  // A steered run holds nothing of its own — no steps, no result, zero spend.
  // The card drops those blocks and keeps the one fact that matters: which run
  // answered instead, and when it picked the message up.
  const steered = run.status === 'STEERED';
  const usageTooltip = useUsageTooltip();
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState('');

  // No confirmation: cancelling destroys nothing, it only stops the run from
  // doing anything new. And it stays "stopping" — the run notices the request
  // at its next seam, which is not something this page can observe.
  const handleStop = async () => {
    setStopping(true);
    setStopError('');
    try {
      await apiService.cancelRun(run.id);
    } catch (err) {
      setStopping(false);
      setStopError(getErrorMessage(err, t('stopRunError')));
    }
  };

  const inputJson = JSON.stringify(run.input ?? {}, null, 2);
  const hasInput = run.input && Object.keys(run.input).length > 0;

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RunStatusBadge status={run.status} />
        <span className="font-mono text-sm font-medium text-foreground">{run.name}</span>
        <span className="text-xs font-mono text-muted">{run.connectorCode}</span>
        {STOPPABLE.includes(run.status) && (
          <button
            type="button"
            onClick={handleStop}
            disabled={stopping}
            className="ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs whitespace-nowrap text-muted transition-colors hover:border-error/50 hover:text-error disabled:cursor-default disabled:opacity-60 disabled:hover:border-border disabled:hover:text-muted"
          >
            <StopIcon className="h-3.5 w-3.5 shrink-0" />
            {stopping ? t('stoppingRun') : t('stopRun')}
          </button>
        )}
      </div>

      {stopError && <ErrorAlert>{stopError}</ErrorAlert>}

      {/* Steps and spend: the two numbers that say how much work this run was,
          before opening anything. The cache counters sit beside the total, never
          inside it — they are billed separately. */}
      {!steered && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Chip>{t('turnsCount', { count: run.turnsCount })}</Chip>
          {run.usage && (
            <>
              <span title={usageTooltip(run.usage)}>
                <Chip tone="accent">
                  {t('usageTotal', { value: formatTokens(run.usage.totalTokens) })}
                </Chip>
              </span>
              <Chip>{t('usageCalls', { value: String(run.usage.calls) })}</Chip>
              {run.usage.cacheReadTokens + run.usage.cacheWriteTokens > 0 && (
                <Chip>
                  {t('usageCache', {
                    read: formatTokens(run.usage.cacheReadTokens),
                    write: formatTokens(run.usage.cacheWriteTokens),
                  })}
                </Chip>
              )}
            </>
          )}
        </div>
      )}

      {/* Where the message actually went. The link is the point of the whole
          card: everything this run would have shown is on that other one. */}
      {steered && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-secondary px-2 py-1.5 text-xs text-muted">
          <span>{t('steeredIntoLead')}</span>
          {run.mainRunId ? (
            <Link
              href={`${runsHref}/${run.mainRunId}`}
              className="font-mono text-accent transition-colors hover:text-accent/80"
            >
              {run.mainRunId.slice(0, 8)}…
            </Link>
          ) : (
            <span>{t('steeredIntoUnknown')}</span>
          )}
          {run.steeredAt && <span>{t('steeredAtSuffix', { at: formatDateTimeFull(run.steeredAt) })}</span>}
        </div>
      )}

      <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-muted">{t('createdAt')}</dt>
          <dd className="text-foreground">{formatDateTimeFull(run.createdAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">{t('lastActivityAt')}</dt>
          <dd className="text-foreground">
            {run.lastActivityAt ? formatDateTimeFull(run.lastActivityAt) : '—'}
          </dd>
        </div>
        {run.occurredAt && (
          <div className="flex gap-2">
            <dt className="text-muted">{t('occurredAt')}</dt>
            <dd className="text-foreground">{formatDateTimeFull(run.occurredAt)}</dd>
          </div>
        )}
        <div className="flex gap-2 min-w-0">
          <dt className="text-muted">{t('externalId')}</dt>
          <dd className="truncate font-mono text-foreground" title={run.externalId}>
            {run.externalId}
          </dd>
        </div>
      </dl>

      {/* An incomplete journal has exactly one consequence worth telling the
          user about, and it is the answer to "why is it asking me again". */}
      {run.turnsIntact === false && (
        <div className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2 py-1.5 text-xs text-warning">
          <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t('turnsNotIntactHint')}</span>
        </div>
      )}

      {hasInput && (
        <Collapsible label={t('eventInput')} preview={previewOf(inputJson)}>
          <TextBlock text={inputJson} />
        </Collapsible>
      )}

      {run.error ? (
        <div className="rounded-lg bg-error/10 px-2 py-1.5 text-xs whitespace-pre-wrap text-error">
          {run.error}
        </div>
      ) : run.result !== null ? (
        <div className="rounded-lg bg-success/5 px-2 py-1.5 text-sm whitespace-pre-wrap break-words text-foreground">
          {run.result}
        </div>
      ) : null}
    </div>
  );
}

// One run in full: what came in, how it ended, every turn it wrote, and the
// message list it started from.
export default function RunDetail({
  runId,
  run,
  runsHref,
  summaryLoading = false,
  summaryError = '',
}: {
  runId: string;
  // The run's row, once it has loaded. A 404 covers both "no such run" and
  // "someone else's" — the steps and the input will answer the same way.
  run: RunResponse | null;
  // The list this run was opened from — a sibling run's page hangs off it, which
  // is how a steered run links to the one that answered for it.
  runsHref: string;
  summaryLoading?: boolean;
  summaryError?: string;
}) {
  const t = useTranslations('Runs');
  // The input opens first: half the "why did it decide that" questions are
  // answered by what the model was handed, before a single step is read.
  const [tab, setTab] = useState('prompt');

  // No snapshot, no tab — `hasPrompt` says so up front, which is what it is for.
  // Until the row loads both tabs stand, so the strip doesn't jump.
  const tabs = [
    ...(run?.hasPrompt === false
      ? []
      : [{ id: 'prompt', label: t('promptTab'), content: <RunPromptView runId={runId} /> }]),
    {
      id: 'turns',
      label: run ? `${t('stepsTab')} · ${run.turnsCount}` : t('stepsTab'),
      content: <RunTurnsList runId={runId} />,
    },
  ];
  const activeTab = tabs.some((candidate) => candidate.id === tab) ? tab : tabs[0].id;

  return (
    <div className="space-y-4">
      {run ? (
        <RunSummary run={run} runsHref={runsHref} />
      ) : summaryLoading ? (
        <div className="rounded-lg border border-border p-3 text-xs text-muted">
          {t('loadingSummary')}
        </div>
      ) : (
        <ErrorAlert>{summaryError || t('runNotFound')}</ErrorAlert>
      )}

      {/* A steered run has no steps and no snapshot by construction, so the
          strip would be two tabs onto two empty states. The card said where the
          work is; that link is the whole page. */}
      {run?.status !== 'STEERED' && (
        <Tabs activeTab={activeTab} onTabChange={setTab} tabs={tabs} />
      )}
    </div>
  );
}
