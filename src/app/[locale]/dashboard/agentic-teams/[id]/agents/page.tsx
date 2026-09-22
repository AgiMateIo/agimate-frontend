'use client';

import { useParams } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { agentsListOptions } from '@/queries/agents';
import AgentsList from '@/components/agents/AgentsList';
import { useAgentsViewMode } from '@/components/agents/agentsViewMode';
import { ViewSwitcher } from '@/components/ui/ViewSwitcher';

// The team header, breadcrumb and ErrorBoundary + Suspense shell live in the
// [id] layout; this page only renders the team's agents.
export default function TeamAgentsPage() {
  const t = useTranslations('AgenticTeams');
  const tAgents = useTranslations('Agents');
  const teamId = useParams().id as string;
  // The same preference as the main agents list: it is the same question.
  const { mode, setMode } = useAgentsViewMode();
  const { data: { content: agents } } = useSuspenseQuery(agentsListOptions(teamId));

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('agents')}</h2>
        <div className="flex items-center gap-3">
          <ViewSwitcher mode={mode} onChange={setMode} />
          <Link
            href={`/dashboard/agentic-teams/${teamId}/agents/create`}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            {tAgents('createAgent')}
          </Link>
        </div>
      </div>

      <AgentsList agents={agents} mode={mode} />
    </div>
  );
}
