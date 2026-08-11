'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import RunsList from '@/components/runs/RunsList';
import AgentMcpUnavailable from '@/components/agents/AgentMcpUnavailable';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { isMcpAgent } from '@/utils/agent';

// `?sessionId=` is what the agent's chat links at: the runs behind one
// conversation, without leaving the agent — its sections come from the path, so
// the global /dashboard/runs would swap the sidebar mid-task.
function AgentRuns({ agentId }: { agentId: string }) {
  const sessionId = useSearchParams().get('sessionId') ?? undefined;

  return (
    <RunsList
      agentId={agentId}
      sessionId={sessionId}
      clearSessionHref={`/dashboard/agents/${agentId}/runs`}
    />
  );
}

export default function AgentRunsPage() {
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);

  // An MCP agent never lands among a trigger's recipients, bound connection or
  // not — the log would stay empty for a reason worth spelling out.
  if (isMcpAgent(agent.type)) {
    return <AgentMcpUnavailable agentId={agentId} section="runs" />;
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <Suspense fallback={null}>
        <AgentRuns agentId={agentId} />
      </Suspense>
    </div>
  );
}
