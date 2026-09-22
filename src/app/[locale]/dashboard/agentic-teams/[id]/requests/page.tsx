'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import AgentRequestsPane from '@/components/agent-requests/AgentRequestsPane';
import AgentRequestThreadView from '@/components/agent-requests/AgentRequestThreadView';
import { agentsListOptions } from '@/queries/agents';
import { useAgentRequestCacheActions, useAgentRequestsQuery } from '@/queries/agent-requests';
import { useAgentRequestsSubscription } from '@/realtime/useAgentRequestsSubscription';
import { getErrorMessage } from '@/utils/error';
import type { AgentRequestStatus } from '@/types';

/**
 * What the agents of a team have handed to each other.
 *
 * Two panes: the branches on the left, the correspondence of the open one on
 * the right; below `md` they take turns. The conversation the errand came out
 * of had a column of its own here and it cost more than it gave — three
 * scrolling columns of somebody else's text read as noise — so the thread now
 * names it in one line and links to where it can be read in full.
 */
export default function TeamRequestsPage() {
  const t = useTranslations('AgentRequests');
  const tCommon = useTranslations('Common');
  const teamId = useParams().id as string;
  useSetBreadcrumb('requests', t('title'));

  // Either end of a request. The backend has `fromAgentId`/`toAgentId` too, but
  // "everything this agent is involved in" is the question people ask of a
  // correspondence, and it is one control instead of two.
  const [agentId, setAgentId] = useState('');
  const [status, setStatus] = useState<AgentRequestStatus | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Below `md` the two panes don't fit side by side, so one is shown at a time.
  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('thread');

  const filters = useMemo(() => (agentId ? { agentId } : {}), [agentId]);
  const query = useAgentRequestsQuery(teamId, filters);
  const requests = query.requests;

  // Non-suspense: the filter select is a convenience, and a team whose agent
  // list fails must not take the correspondence down with it.
  const { data: agentsPage } = useQuery(agentsListOptions(teamId));

  // The pills narrow what is on screen, and the open thread is picked out of
  // that same set: filtering to "never started" and landing in a branch that is
  // not in the list reads as the filter having done nothing.
  const visible = useMemo(
    () => (status ? requests.filter((r) => r.status === status) : requests),
    [requests, status],
  );

  // Land in the freshest branch rather than an empty frame — derived, so a row
  // that drops out of the visible set falls back to the newest on its own.
  const active = visible.find((r) => r.id === activeId) ?? visible[0] ?? null;

  const { patchRequest, invalidateLists, invalidateThread } = useAgentRequestCacheActions(teamId);
  // A branch the user has loaded is updated from the event itself; one that has
  // just started is a row nobody has, so the list is re-read instead. The open
  // thread is always re-read: the row says what happened, not what was said.
  useAgentRequestsSubscription(teamId, {
    onRequest: (kind, row) => {
      if (kind === 'started') invalidateLists();
      else patchRequest(row);
      // Against what is on screen, not against what was clicked: the open
      // thread is usually the one nobody selected — the freshest row.
      if (row.id === active?.id) invalidateThread(row.id);
    },
  });

  const error = query.error ? getErrorMessage(query.error, t('loadError')) : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        {/* Both panes stay mounted; below `md` only one is displayed. */}
        <AgentRequestsPane
          className={mobilePane === 'list' ? 'flex' : 'hidden'}
          requests={visible}
          filtered={status !== null}
          loading={query.isPending}
          activeId={active?.id ?? null}
          onSelect={(id) => {
            setActiveId(id);
            setMobilePane('thread');
          }}
          agents={agentsPage?.content ?? []}
          agentId={agentId}
          onAgentChange={(id) => {
            setAgentId(id);
            setActiveId(null);
          }}
          status={status}
          onStatusChange={setStatus}
          hasMore={query.hasNextPage}
          loadingMore={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
        />

        <div
          className={`${mobilePane === 'thread' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col md:flex`}
        >
          {active ? (
            <AgentRequestThreadView
              key={active.id}
              teamId={teamId}
              threadId={active.id}
              fallbackRow={active}
              onBack={() => setMobilePane('list')}
            />
          ) : query.isPending ? (
            <Placeholder>{tCommon('loading')}</Placeholder>
          ) : requests.length > 0 ? (
            // Filtered down to nothing — the team has correspondence, just not
            // of the status that is selected.
            <Placeholder>{t('emptyFiltered')}</Placeholder>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <ArrowsRightLeftIcon className="h-12 w-12 text-muted/50" />
              <div className="text-sm font-medium text-foreground">{t('emptyTitle')}</div>
              <div className="max-w-sm text-sm text-muted">{t('emptyHint')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
