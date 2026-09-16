'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon, ArrowPathIcon, WindowIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import { useAgentViewContentQuery, useAgentViewsQuery } from '@/queries/agents';
import { getErrorMessage } from '@/utils/error';
import AgentViewFrame from './AgentViewFrame';
import type { AgentViewResponse } from '@/types';

const viewTitle = (view: AgentViewResponse) => view.connectionName ?? view.connectorCode;

function ViewCard({ view, onOpen }: { view: AgentViewResponse; onOpen: () => void }) {
  const t = useTranslations('AgentViews');

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <WindowIcon className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-medium">{viewTitle(view)}</span>
        </div>
        {/* The uri identifies the view and nothing else — shown as text, never
            as a link: `ui://…` addresses nothing a browser can open. */}
        <p className="truncate font-mono text-xs text-muted" title={view.uri}>
          {view.uri}
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {view.tools.map((tool) => (
            <Chip key={tool}>{tool}</Chip>
          ))}
        </div>
      </div>
      <Button variant="secondary" onClick={onOpen}>
        {t('open')}
      </Button>
    </div>
  );
}

// One opened view. The body is fetched per opening — the query is uncached, so
// closing and re-opening asks the MCP server again, which is the point: the
// page is the server's to change.
function OpenView({ agentId, view, onClose }: { agentId: string; view: AgentViewResponse; onClose: () => void }) {
  const t = useTranslations('AgentViews');
  const { data: content, error, isLoading, refetch, isFetching, dataUpdatedAt } = useAgentViewContentQuery(view, agentId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{viewTitle(view)}</h2>
          <p className="truncate font-mono text-xs text-muted">{view.uri}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
            <ArrowPathIcon className="h-4 w-4" />
            {t('reload')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            <ArrowLeftIcon className="h-4 w-4" />
            {t('backToList')}
          </Button>
        </div>
      </div>

      {error ? (
        // 404 (the view is no longer the agent's) and 502 (the server did not
        // answer) both arrive with a message written for a reader.
        <ErrorAlert>{getErrorMessage(error, t('loadError'))}</ErrorAlert>
      ) : isLoading || !content ? (
        <Placeholder size="sm">{t('loading')}</Placeholder>
      ) : (
        // Keyed by the fetch, not by the view or its markup: the handshake
        // happens once per document, so a reload has to hand the bridge a new
        // frame — and markup that came back byte-identical (or merely the same
        // length) would otherwise leave the button doing nothing at all.
        <AgentViewFrame key={dataUpdatedAt} agentId={agentId} view={view} content={content} />
      )}
    </div>
  );
}

export default function AgentViewsTab({ agentId }: { agentId: string }) {
  const t = useTranslations('AgentViews');
  const { data: views } = useAgentViewsQuery(agentId);
  const [open, setOpen] = useState<AgentViewResponse | null>(null);

  if (open) {
    return <OpenView agentId={agentId} view={open} onClose={() => setOpen(null)} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('hint')}</p>
      {views.length === 0 ? (
        <Placeholder size="sm">{t('empty')}</Placeholder>
      ) : (
        <div className="space-y-3">
          {views.map((view) => (
            <ViewCard
              key={`${view.connectionId}:${view.uri}`}
              view={view}
              onOpen={() => setOpen(view)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
