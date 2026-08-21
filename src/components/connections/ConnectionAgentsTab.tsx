'use client';

import { useTranslations, useLocale } from 'next-intl';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import { useConnectionAgentsQuery } from '@/queries/connections';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Chip } from '@/components/ui/Chip';
import { Placeholder } from '@/components/ui/Placeholder';

interface ConnectionAgentsTabProps {
  connectionId: string;
  // Only credential-bearing connectors can be bound to an agent by hand; for the
  // rest the binding follows the agent's skills, so we don't offer the shortcut.
  canBind: boolean;
}

// Who this connection is handed out to — the answer to "whom does a change here
// affect". Not a delivery forecast: an agent listed here still needs the
// connection enabled and its binding policies to allow the tool/trigger.
export default function ConnectionAgentsTab({ connectionId, canBind }: ConnectionAgentsTabProps) {
  const t = useTranslations('ConnectionDetail');
  const tConn = useTranslations('Connections');
  const bcp47Locale = localeMap[useLocale()];

  const { data: agents, isPending, error } = useConnectionAgentsQuery(connectionId);

  if (isPending) {
    return <Placeholder>{t('agentsLoading')}</Placeholder>;
  }

  if (error) {
    return <ErrorAlert>{getErrorMessage(error, t('agentsError'))}</ErrorAlert>;
  }

  if (agents.length === 0) {
    return (
      <div className="bg-surface-secondary rounded-lg border border-border/50 p-8 text-center space-y-2">
        <p className="text-sm text-muted">{t('agentsEmpty')}</p>
        {canBind ? (
          <Link
            href="/dashboard/agents"
            className="inline-block text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {t('agentsEmptyBind')}
          </Link>
        ) : (
          <p className="text-xs text-muted/80">{t('agentsManagedBySkills')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted">{t('agentsTotal', { count: agents.length })}</div>

      <div className="space-y-2">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/dashboard/agents/${agent.agentId}`}
            className={`group flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-surface-secondary hover:border-accent/50 transition-colors ${
              agent.enabled ? '' : 'opacity-60'
            }`}
          >
            <img
              src={getAgentAvatarUrl(agent.name)}
              alt=""
              className="h-10 w-10 rounded-lg shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                  {agent.name}
                </span>
                {!agent.enabled && <Chip>{tConn('disabled')}</Chip>}
              </div>
              {agent.description && (
                <p className="text-sm text-muted mt-0.5 line-clamp-2">{agent.description}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted hidden sm:block">
              {t('agentBoundAt', { date: formatDate(agent.createdAt, bcp47Locale) })}
            </span>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
