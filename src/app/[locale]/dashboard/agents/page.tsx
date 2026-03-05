'use client';

import { Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentResponse, PagedResponse } from '@/types';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import AgentsList from '@/components/agents/AgentsList';

function AgentsContent({
  dataPromise,
  onUpdate,
}: {
  dataPromise: Promise<PagedResponse<AgentResponse>>;
  onUpdate: () => void;
}) {
  const t = useTranslations('Agents');
  const { content: agents } = use(dataPromise);

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
        <Link
          href="/dashboard/agents/create"
          className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          {t('createAgent')}
        </Link>
      </div>

      <AgentsList
        agents={agents}
        onUpdate={onUpdate}
      />
    </div>
  );
}

export default function AgentsPage() {
  const t = useTranslations('Agents');
  const { promise, invalidate } = usePromiseCache(
    () => apiService.getAgentsList(),
    [],
    'agents'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Agents Section */}
      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingAgents')}</div>}>
          <AgentsContent dataPromise={promise} onUpdate={invalidate} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
