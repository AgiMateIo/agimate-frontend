'use client';

import { useTranslations } from 'next-intl';
import { QueueListIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { Chip } from '@/components/ui/Chip';
import SessionTranscript from '@/components/sessions/SessionTranscript';
import { connectorCatalogOptions } from '@/queries/connectors';
import { connectorNameOf } from '@/utils/connector';
import type { AgentRequestRow } from '@/types';

/**
 * Where the errand came from: the sender's own conversation.
 *
 * Read-only and the same for every connector — a webchat conversation has no
 * address of its own (the chat screen keeps the open session in state, not in
 * the URL), so there is nothing to link to and the transcript is shown in place
 * instead. Which is also what the reader wants here: not the chat, but the
 * three lines of it that explain the errand.
 */
export default function AgentRequestOrigin({ request }: { request: AgentRequestRow }) {
  const t = useTranslations('AgentRequests');
  const { data: catalog } = useQuery(connectorCatalogOptions());

  const { origin } = request;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 space-y-1.5 border-b border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {origin.title || t('originUntitled')}
          </h3>
          <Chip>{connectorNameOf(catalog, origin.connectorCode)}</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="truncate">{t('originOf', { agent: request.from.agentName })}</span>
          {/* What the sender was doing when it delegated — its own runs for that
              conversation, not the addressee's. */}
          <Link
            href={`/dashboard/agents/${request.from.agentId}/runs?sessionId=${origin.sessionId}`}
            className="flex shrink-0 items-center gap-1 text-accent transition-colors hover:text-accent/80"
          >
            <QueueListIcon className="h-3.5 w-3.5" />
            {t('originRuns')}
          </Link>
        </div>
      </div>

      {/* The transcript fills whatever height it is given; its own scroll is the
          only one in this column. */}
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <SessionTranscript sessionId={origin.sessionId} />
      </div>
    </div>
  );
}
