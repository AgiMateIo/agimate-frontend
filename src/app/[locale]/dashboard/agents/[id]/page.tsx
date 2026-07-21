'use client';

import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LockClosedIcon, KeyIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { formatDate } from '@/utils/date';

const getAgentTypeColor = (dest: string) => {
  switch (dest) {
    case 'CENTRIFUGO':
      return 'bg-accent/10 text-accent';
    case 'WEBHOOK':
      return 'bg-success/10 text-success';
    case 'GENERIC':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-muted/10 text-muted';
  }
};

export default function AgentGeneralPage() {
  const t = useTranslations('Agents');
  const locale = useLocale();
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
      {/* Status & Key ID + Edit */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              agent.enabled ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${agent.enabled ? 'bg-success' : 'bg-muted'}`} />
            {agent.enabled ? t('enabled') : t('disabled')}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-surface-secondary border border-border/50 rounded-full px-3 py-1 text-xs text-muted font-mono">
            <KeyIcon className="h-3 w-3" />
            {agent.maskedKeyId}
          </span>
        </div>
        <Link
          href={`/dashboard/agents/${agent.id}/edit`}
          className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors shrink-0"
        >
          <PencilIcon className="h-4 w-4" />
          {t('editAgentTitle')}
        </Link>
      </div>

      {/* Description */}
      {agent.description && (
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">{t('description')}</h3>
          <p className="text-sm text-foreground">{agent.description}</p>
        </div>
      )}

      {/* Prompt */}
      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('prompt')}</h3>
        <div className="bg-surface-secondary rounded-lg border border-border/50 p-4">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{agent.instructions}</pre>
        </div>
      </div>

      {/* Agent Type */}
      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('agentType')}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${getAgentTypeColor(agent.type)}`}>
            {agent.type}
          </span>
          {agent.type === 'WEBHOOK' && agent.webhookUrl && (
            <span className="inline-block bg-surface-secondary border border-border/50 rounded px-2.5 py-1 text-xs text-muted font-mono">
              {agent.webhookUrl}
            </span>
          )}
          {agent.hasWebhookAuth && (
            <span className="inline-flex items-center gap-1 bg-surface-secondary border border-border/50 rounded px-2.5 py-1 text-xs text-muted">
              <LockClosedIcon className="h-3 w-3" />
              Auth
            </span>
          )}
        </div>
      </div>

      {/* Created At */}
      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('createdAt')}</h3>
        <p className="text-sm text-foreground">{formatDate(agent.createdAt, locale)}</p>
      </div>
    </div>
  );
}
