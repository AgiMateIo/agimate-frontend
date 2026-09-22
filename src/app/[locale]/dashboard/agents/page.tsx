'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useAgentsListQuery } from '@/queries/agents';
import AgentsList from '@/components/agents/AgentsList';
import { useAgentsViewMode } from '@/components/agents/agentsViewMode';
import { ViewSwitcher } from '@/components/ui/ViewSwitcher';
import { Placeholder } from '@/components/ui/Placeholder';
import type { ViewMode } from '@/utils/viewMode';

function AgentsContent({ mode }: { mode: ViewMode }) {
  const { data: { content: agents } } = useAgentsListQuery();

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentsList agents={agents} mode={mode} />
    </div>
  );
}

export default function AgentsPage() {
  const t = useTranslations('Agents');
  const { mode, setMode } = useAgentsViewMode();

  return (
    <div className="space-y-6">
      {/* Header — actions live here (next to the title), matching the other list pages. */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Outside the Suspense boundary: switching the layout must not
              unmount the control that switched it. */}
          <ViewSwitcher mode={mode} onChange={setMode} />
          <Link
            href="/dashboard/agents/create"
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            {t('createAgent')}
          </Link>
        </div>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<Placeholder>{t('loadingAgents')}</Placeholder>}>
          <AgentsContent mode={mode} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
