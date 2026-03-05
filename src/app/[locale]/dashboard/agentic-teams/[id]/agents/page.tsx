'use client';

import { Suspense, use } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentResponse, PagedResponse } from '@/types';
import { AgenticTeam } from '@/types/agentic-teams';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import AgentsList from '@/components/agents/AgentsList';

function TeamAgentsContent({
  dataPromise,
  onUpdate,
  teamId,
}: {
  dataPromise: Promise<[PagedResponse<AgentResponse>, AgenticTeam]>;
  onUpdate: () => void;
  teamId: string;
}) {
  const t = useTranslations('AgenticTeams');
  const tAgents = useTranslations('Agents');
  const [{ content: agents }, team] = use(dataPromise);

  useSetBreadcrumb(teamId, team?.name);

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

      <AgentsList
        agents={agents}
        onUpdate={onUpdate}
      />
    </div>
  );
}

export default function TeamAgentsPage() {
  const t = useTranslations('AgenticTeams');
  const params = useParams();
  const teamId = params.id as string;

  const { promise, invalidate } = usePromiseCache(
    () => Promise.all([
      apiService.getAgentsList({ agenticTeamPubId: teamId }),
      apiService.getAgenticTeam(teamId),
    ]),
    [teamId],
    'team-agents'
  );

  return (
    <div className="space-y-6">
      {/* Header — always visible */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('teamAgents')}</h1>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingAgents')}</div>}>
          <TeamAgentsContent dataPromise={promise} onUpdate={invalidate} teamId={teamId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
