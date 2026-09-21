'use client';

import { useTranslations } from 'next-intl';
import { ArrowLongRightIcon } from '@heroicons/react/24/outline';
import { Select } from '@/components/ui/FormField';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { Placeholder } from '@/components/ui/Placeholder';
import { formatDateTimeShort } from '@/utils/date';
import type { AgentRequestRow, AgentRequestStatus } from '@/types';
import {
  AgentRequestStatusChip,
  STATUS_LABEL_KEYS,
  UndeliveredReportChip,
  isReportUndelivered,
} from './AgentRequestStatus';

// The statuses in the order they mean something to a reader: what is happening,
// what went wrong, what finished.
export const STATUS_FILTERS: AgentRequestStatus[] = [
  'WORKING',
  'STALLED',
  'FAILED',
  'DONE',
  'CANCELLED',
];

interface AgentRequestsPaneProps {
  // Already narrowed by the status pills — the page filters, because the open
  // thread is picked out of the same visible set.
  requests: AgentRequestRow[];
  // Whether the pills are hiding anything, which is the difference between
  // "nothing here" and "nothing matched".
  filtered: boolean;
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  // Either end of a request; '' is every agent of the team.
  agents: { id: string; name: string }[];
  agentId: string;
  onAgentChange: (agentId: string) => void;
  // Applied here rather than in the query: the status is computed off the
  // branch's runs, so the backend has no filter for it (see AgentRequestStatus).
  status: AgentRequestStatus | null;
  onStatusChange: (status: AgentRequestStatus | null) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  // Display utility only (`flex`/`hidden`): below `md` the page shows one pane
  // at a time. The width stays here so the pane always has a definite one.
  className?: string;
}

export default function AgentRequestsPane({
  requests,
  filtered,
  loading,
  activeId,
  onSelect,
  agents,
  agentId,
  onAgentChange,
  status,
  onStatusChange,
  hasMore,
  loadingMore,
  onLoadMore,
  className = 'flex',
}: AgentRequestsPaneProps) {
  const t = useTranslations('AgentRequests');
  const tCommon = useTranslations('Common');

  return (
    // A definite width in both modes — full screen on a phone, a fixed column
    // from `md` up. Never `flex-1`: a flex item's `min-width: auto` is its
    // min-content, so a grow-based pane refuses to go narrower than its rows.
    <div
      className={`${className} w-full shrink-0 flex-col min-h-0 overflow-hidden border-border md:flex md:w-80 md:border-r`}
    >
      <div className="space-y-2 border-b border-border p-3">
        <Select value={agentId} onChange={(e) => onAgentChange(e.target.value)}>
          <option value="">{t('filterAllAgents')}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <FilterRow label={t('filterStatus')}>
          <FilterPill active={status === null} onClick={() => onStatusChange(null)}>
            {t('filterAllStatuses')}
          </FilterPill>
          {STATUS_FILTERS.map((s) => (
            <FilterPill
              key={s}
              active={status === s}
              onClick={() => onStatusChange(status === s ? null : s)}
            >
              {t(STATUS_LABEL_KEYS[s])}
            </FilterPill>
          ))}
        </FilterRow>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <Placeholder size="sm">{tCommon('loading')}</Placeholder>
        ) : requests.length === 0 ? (
          <Placeholder size="sm">{filtered ? t('emptyFiltered') : t('empty')}</Placeholder>
        ) : (
          requests.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={`w-full border-b border-border px-3 py-2.5 text-left transition-colors ${
                r.id === activeId ? 'bg-accent/5' : 'hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {r.title || t('untitled')}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted">
                  {formatDateTimeShort(r.lastActivityAt)}
                </span>
              </div>
              {/* Who asked whom: the row is read from outside both agents, so
                  neither name can be left implied. */}
              <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                <span className="min-w-0 truncate">{r.from.agentName}</span>
                <ArrowLongRightIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate text-foreground">{r.to.agentName}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <AgentRequestStatusChip status={r.status} />
                {isReportUndelivered(r) && <UndeliveredReportChip />}
                {r.requestsCount > 1 && (
                  <span className="text-[11px] text-muted">
                    {t('requestsCount', { count: r.requestsCount })}
                  </span>
                )}
              </div>
            </button>
          ))
        )}

        {/* Kept whatever the status filter leaves visible: the filter runs over
            the loaded pages only, so older matches are behind this button. */}
        {hasMore && (
          <div className="p-3 text-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="cursor-pointer text-xs text-accent underline underline-offset-2 transition-colors hover:text-accent/80 disabled:cursor-default disabled:no-underline disabled:opacity-50"
            >
              {loadingMore ? tCommon('loading') : tCommon('loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
