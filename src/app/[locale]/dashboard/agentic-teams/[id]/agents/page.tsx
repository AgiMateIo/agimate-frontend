'use client';

import { useParams } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { agentsListOptions } from '@/queries/agents';
import AgentsList from '@/components/agents/AgentsList';

// The team header, breadcrumb and ErrorBoundary + Suspense shell live in the
// [id] layout; this page only renders the team's agents.
export default function TeamAgentsPage() {
  const t = useTranslations('AgenticTeams');
  const tAgents = useTranslations('Agents');
  const teamId = useParams().id as string;
  const { data: { content: agents } } = useSuspenseQuery(agentsListOptions(teamId));

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('agents')}</h2>
        <Link
          href={`/dashboard/agents/create?teamId=${teamId}`}
          className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          {tAgents('createAgent')}
        </Link>
      </div>

      <AgentsList agents={agents} />
    </div>
  );
}
