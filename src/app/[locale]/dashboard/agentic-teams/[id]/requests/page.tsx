'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowsRightLeftIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import AgentRequestsPane from '@/components/agent-requests/AgentRequestsPane';
import AgentRequestThreadView from '@/components/agent-requests/AgentRequestThreadView';
import AgentRequestOrigin from '@/components/agent-requests/AgentRequestOrigin';
import { agentsListOptions } from '@/queries/agents';
import { useAgentRequestCacheActions, useAgentRequestsQuery } from '@/queries/agent-requests';
import { useAgentRequestsSubscription } from '@/realtime/useAgentRequestsSubscription';
import { getErrorMessage } from '@/utils/error';
import type { AgentRequestStatus } from '@/types';

/**
 * What the agents of a team have handed to each other.
 *
 * Three panes: the branches on the left, the correspondence of the open one in
 * the middle, and the conversation it came out of on the right — the question
 * "why was this asked at all" is answered by the sender's chat and nowhere
 * else. The third column only exists from `xl` up; below that it folds into a
 * block above the exchange, and below `md` the list and the thread take turns.
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
  const [originOpen, setOriginOpen] = useState(false);

  const filters = useMemo(() => (agentId ? { agentId } : {}), [agentId]);
  const query = useAgentRequestsQuery(teamId, filters);
  const requests = query.requests;

  // Non-suspense: the filter select is a convenience, and a team whose agent
  // list fails must not take the correspondence down with it.
  const { data: agentsPage } = useQuery(agentsListOptions(teamId));

  const { patchRequest, invalidateLists, invalidateThread } = useAgentRequestCacheActions(teamId);
  // A branch the user has loaded is updated from the event itself; one that has
  // just started is a row nobody has, so the list is re-read instead. The open
  // thread is always re-read: the row says what happened, not what was said.
  useAgentRequestsSubscription(teamId, {
    onRequest: (kind, row) => {
      if (kind === 'started') invalidateLists();
      else patchRequest(row);
      if (row.id === activeId) invalidateThread(row.id);
    },
  });

  // Land in the freshest branch rather than an empty frame — derived, so a row
  // that drops out of a filtered list falls back to the newest on its own.
  const active = requests.find((r) => r.id === activeId) ?? requests[0] ?? null;

  const error = query.error ? getErrorMessage(query.error, t('loadError')) : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        {/* Both panes stay mounted; below `md` only one is displayed. */}
        <AgentRequestsPane
          className={mobilePane === 'list' ? 'flex' : 'hidden'}
          requests={requests}
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
            <>
              {/* The origin below `xl`, where there is no room for a column of
                  it — folded away, because the correspondence is what the
                  screen is opened for. */}
              <div className="shrink-0 border-b border-border xl:hidden">
                <button
                  type="button"
                  onClick={() => setOriginOpen((v) => !v)}
                  aria-expanded={originOpen}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted transition-colors hover:bg-surface-secondary"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {t('originOf', { agent: active.from.agentName })}
                  </span>
                  <ChevronDownIcon
                    className={`h-4 w-4 shrink-0 transition-transform ${originOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {originOpen && (
                  <div className="h-80 border-t border-border">
                    <AgentRequestOrigin key={active.id} request={active} />
                  </div>
                )}
              </div>

              <AgentRequestThreadView
                key={active.id}
                teamId={teamId}
                threadId={active.id}
                fallbackRow={active}
                onBack={() => setMobilePane('list')}
              />
            </>
          ) : query.isPending ? (
            <Placeholder>{tCommon('loading')}</Placeholder>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <ArrowsRightLeftIcon className="h-12 w-12 text-muted/50" />
              <div className="text-sm font-medium text-foreground">{t('emptyTitle')}</div>
              <div className="max-w-sm text-sm text-muted">{t('emptyHint')}</div>
            </div>
          )}
        </div>

        {active && (
          <div className="hidden w-96 shrink-0 flex-col border-l border-border xl:flex">
            <AgentRequestOrigin key={active.id} request={active} />
          </div>
        )}
      </div>
    </div>
  );
}
