'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeftIcon, ArrowLongRightIcon, QueueListIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import { ErrandRequestCard } from '@/components/sessions/ErrandRequestCard';
import { useAgentRequestThreadQuery } from '@/queries/agent-requests';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import type {
  AgentRequestExchangeItem,
  AgentRequestExchangeReport,
  AgentRequestExchangeRequest,
  AgentRequestRow,
} from '@/types';
import {
  AgentRequestStatusChip,
  UndeliveredReportChip,
  isReportUndelivered,
} from './AgentRequestStatus';

// One errand of the branch. The same card the transcript of a delegated session
// draws — it is the same block, read from the other side — with the sender's
// name filled in from the row rather than from the XML.
function ExchangeRequest({
  item,
  request,
}: {
  item: AgentRequestExchangeRequest;
  request: AgentRequestRow;
}) {
  const t = useTranslations('AgentRequests');
  const locale = useLocale();

  return (
    <div>
      <ErrandRequestCard
        request={{
          title: item.title,
          mode: item.mode,
          instructions: item.instructions,
          context: item.context,
          fromAgent: request.from.agentName,
          fromAgentId: request.from.agentId,
        }}
      />
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
        <span>{formatDate(item.at, locale)}</span>
        <RunLink runId={item.runId} />
        {/* Appended to a branch that was already running: the run at work took
            the message in, so no report answers this errand on its own. */}
        {item.absorbed && <span>{t('absorbed')}</span>}
      </div>
    </div>
  );
}

// What came back. Drawn opposite the errand because it is the other direction
// of the correspondence — the run behind it is still the addressee's — and a
// failed report is a report, not an error of ours.
function ExchangeReport({ item }: { item: AgentRequestExchangeReport }) {
  const t = useTranslations('AgentRequests');
  const locale = useLocale();
  const failed = item.status === 'FAILED';

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div
          className={`rounded-lg border px-3 py-2.5 ${
            failed ? 'border-error/40 bg-error/5' : 'border-border bg-surface-secondary/60'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Chip strong tone={failed ? 'error' : 'success'}>
              {failed ? t('reportFailed') : t('reportDone')}
            </Chip>
            {/* The answer never reached the conversation that asked for it —
                the same mark the row carries, where the reader is looking. */}
            {item.reportedAt === null && !failed && <UndeliveredReportChip />}
          </div>
          {item.text && (
            <div className="mt-2 text-sm break-words whitespace-pre-wrap text-foreground">
              {item.text}
            </div>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-[10px] text-muted">
          <span>{formatDate(item.at, locale)}</span>
          <RunLink runId={item.runId} />
        </div>
      </div>
    </div>
  );
}

// Either item links into the run that did the work — the addressee's, on both
// sides of the correspondence. The global runs route, which needs no owner in
// its path, is what keeps that from having to be restated here.
function RunLink({ runId }: { runId: string }) {
  const t = useTranslations('AgentRequests');
  return (
    <Link
      href={`/dashboard/runs/${runId}`}
      className="text-accent transition-colors hover:text-accent/80"
    >
      {t('viewRun')}
    </Link>
  );
}

function ExchangeItem({
  item,
  request,
}: {
  item: AgentRequestExchangeItem;
  request: AgentRequestRow;
}) {
  return item.kind === 'REQUEST' ? (
    <ExchangeRequest item={item} request={request} />
  ) : (
    <ExchangeReport item={item} />
  );
}

/**
 * One branch as a correspondence: the errands one agent handed over and what
 * the other reported back, oldest first.
 *
 * The row it starts from is the listing's — the thread endpoint answers it
 * again, and the fresher of the two is the one that came with the thread.
 */
export default function AgentRequestThreadView({
  teamId,
  threadId,
  fallbackRow,
  onBack,
}: {
  teamId: string;
  threadId: string;
  fallbackRow: AgentRequestRow;
  onBack: () => void;
}) {
  const t = useTranslations('AgentRequests');
  const tCommon = useTranslations('Common');
  const { data, isPending, error } = useAgentRequestThreadQuery(teamId, threadId);

  const request = data?.request ?? fallbackRow;

  return (
    <>
      <div className="shrink-0 border-b border-border px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2">
          {/* Below `md` the list is a screen of its own, and this is the way
              back to it. */}
          <button
            type="button"
            onClick={onBack}
            aria-label={tCommon('back')}
            className="-ml-1 shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground md:hidden"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {request.title || t('untitled')}
          </h2>
          {/* The work itself: the addressee's branch is a session of theirs, and
              its runs are where the tool calls and the spend are. */}
          <Link
            href={`/dashboard/agents/${request.to.agentId}/runs?sessionId=${request.id}`}
            className="flex shrink-0 items-center gap-1 text-xs text-accent transition-colors hover:text-accent/80"
          >
            <QueueListIcon className="h-3.5 w-3.5" />
            {t('viewBranchRuns')}
          </Link>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
            <span className="truncate">{request.from.agentName}</span>
            <ArrowLongRightIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-foreground">{request.to.agentName}</span>
          </span>
          <AgentRequestStatusChip status={request.status} />
          {isReportUndelivered(request) && <UndeliveredReportChip />}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
        {error ? (
          <ErrorAlert>{getErrorMessage(error, t('threadLoadError'))}</ErrorAlert>
        ) : isPending ? (
          <Placeholder size="sm">{tCommon('loading')}</Placeholder>
        ) : data && data.exchange.length > 0 ? (
          data.exchange.map((item, i) => (
            <ExchangeItem key={`${item.kind}-${item.runId}-${i}`} item={item} request={request} />
          ))
        ) : (
          <Placeholder size="sm">{t('emptyExchange')}</Placeholder>
        )}
      </div>
    </>
  );
}
