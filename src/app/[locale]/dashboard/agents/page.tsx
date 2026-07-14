'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useAgentsListQuery } from '@/queries/agents';
import AgentsList from '@/components/agents/AgentsList';

function AgentsContent() {
  const { data: { content: agents } } = useAgentsListQuery();

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentsList agents={agents} />
    </div>
  );
}

export default function AgentsPage() {
  const t = useTranslations('Agents');

  return (
    <div className="space-y-6">
      {/* Header — action lives here (next to the title), matching the other list pages. */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted mt-1">{t('subtitle')}</p>
        </div>
        <Link
          href="/dashboard/agents/create"
          className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          {t('createAgent')}
        </Link>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingAgents')}</div>}>
          <AgentsContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
