'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import RunPageContent from '@/components/runs/RunPageContent';

// The agent's own copy of the run page: same content, but the route stays under
// the agent, so the sidebar keeps showing the agent's sections.
export default function AgentRunDetailPage() {
  const t = useTranslations('Runs');
  const params = useParams();
  const agentId = params.id as string;
  const runId = params.runId as string;

  return (
    <RunPageContent
      runId={runId}
      backHref={`/dashboard/agents/${agentId}/runs`}
      backLabel={t('backToAgentRuns')}
    />
  );
}
