'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Pagination } from '@/components/ui/Pagination';
import { useRunTurnsQuery } from '@/queries/runs';
import { formatDateTimeShort, formatDateTimeFull } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import type { RunTurnResponse } from '@/types';
import { Placeholder } from '@/components/ui/Placeholder';
import {
  Collapsible,
  RoleIcon,
  TextBlock,
  ToolCallBlock,
  ToolResultBlock,
  formatTokens,
  previewOf,
  useUsageTooltip,
} from './RunBlocks';

// One row of the transcript.
function TurnRow({ turn }: { turn: RunTurnResponse }) {
  const t = useTranslations('Runs');
  const usageTooltip = useUsageTooltip();

  return (
    <tr className="border-b border-border align-top last:border-b-0 hover:bg-surface-secondary/40">
      <td className="py-2.5 pr-2 pl-1 text-xs font-mono text-muted/70">{turn.turnIndex}</td>
      <td className="py-2.5 pr-3">
        <RoleIcon role={turn.role} />
      </td>
      {/* The order the turn actually happened in: the model reasons, then says
          something, then calls a tool. */}
      <td className="space-y-1.5 py-2.5 pr-3">
        {/* A run starts from exactly one user message, at index 0. Any user turn
            past it arrived while the run was already working and was taken over
            — which is where the answer to "and where did my second question go"
            lives, so it is labelled rather than left to look like a duplicate. */}
        {turn.role === 'USER' && turn.turnIndex > 0 && (
          <div className="text-xs font-medium text-accent">{t('steeredIntoTurn')}</div>
        )}

        {turn.thinkingText && (
          <Collapsible label={t('reasoning')} preview={previewOf(turn.thinkingText)}>
            <TextBlock text={turn.thinkingText} />
          </Collapsible>
        )}

        {turn.text && (
          <div className="whitespace-pre-wrap break-words text-sm text-foreground">{turn.text}</div>
        )}

        {(turn.toolCalls ?? []).map((call, i) => (
          <ToolCallBlock key={call.id || `call-${i}`} call={call} />
        ))}
        {(turn.toolResults ?? []).map((result, i) => (
          <ToolResultBlock
            key={result.id || `result-${i}`}
            name={result.name}
            json={result.outputJson}
            failed={result.failed}
          />
        ))}
      </td>
      <td
        className="py-2.5 text-right text-xs whitespace-nowrap text-muted/70"
        title={[
          formatDateTimeFull(turn.createdAt),
          turn.finishReason && t('finishReason', { reason: turn.finishReason }),
          turn.callId && `callId: ${turn.callId}`,
        ]
          .filter(Boolean)
          .join('\n')}
      >
        <div>{formatDateTimeShort(turn.createdAt)}</div>
        {turn.model && (
          <div className="truncate font-mono text-[11px] text-muted/60">{turn.model}</div>
        )}
        {/* Only when the spend is known: `null` covers both "no model call" and
            "the report went missing", and neither of those is a zero to print. */}
        {turn.usage && (
          <div className="text-[11px] text-muted/60" title={usageTooltip(turn.usage)}>
            {t('usageTotal', { value: formatTokens(turn.usage.totalTokens) })}
          </div>
        )}
      </td>
    </tr>
  );
}

// The turn journal of one run. The backend hands it back newest-first, like
// every other list; a transcript is read the other way round, so each page is
// reversed for display — the paging note appears only when there is more than
// one page, where "page 1" is the end of the run rather than its start.
export default function RunTurnsList({ runId }: { runId: string }) {
  const t = useTranslations('Runs');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const { data, isPending, error } = useRunTurnsQuery(runId, page, pageSize);
  const turns = useMemo(() => [...(data?.content ?? [])].reverse(), [data]);

  if (error && !data) {
    return <ErrorAlert>{getErrorMessage(error, t('loadTurnsError'))}</ErrorAlert>;
  }
  if (isPending) {
    return <Placeholder size="sm">{t('loadingTurns')}</Placeholder>;
  }
  if (turns.length === 0) {
    return <Placeholder size="sm">{t('noTurns')}</Placeholder>;
  }

  return (
    <div className="space-y-3">
      {(data?.totalPages ?? 1) > 1 && (
        <div className="text-xs text-muted">{t('turnsPagingHint')}</div>
      )}
      {/* `table-fixed` is load-bearing: with automatic layout a single unbroken
          token inside a tool result (a URL, a base64 blob) sets the column's
          min-content width, the table grows past the page and the whole thing
          gets a horizontal scrollbar of its own — on top of the one the block
          already has. Fixed widths keep the overflow inside the block it
          belongs to. */}
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-border">
            <th className="w-9 py-2 pr-2 pl-1 text-left text-xs font-medium text-muted">#</th>
            {/* The column is the icons; its name lives on the cell rather than
                in a hidden span (see RoleIcon for why nothing here is `sr-only`). */}
            <th aria-label={t('turnRole')} className="w-10 py-2 pr-3" />
            <th className="py-2 pr-3 text-left text-xs font-medium text-muted">
              {t('turnContent')}
            </th>
            <th className="w-20 py-2 text-right text-xs font-medium text-muted sm:w-28">
              {t('createdAt')}
            </th>
          </tr>
        </thead>
        <tbody>
          {turns.map((turn) => (
            <TurnRow key={turn.turnIndex} turn={turn} />
          ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalElements={data?.totalElements ?? 0}
        totalPages={data?.totalPages ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        rowsPerPageLabel={t('turnsPerPage')}
        pageSizeOptions={[20, 50, 100]}
      />
    </div>
  );
}
