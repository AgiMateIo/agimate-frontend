'use client';

import { useParams } from 'next/navigation';
import AgentModelsTab from '@/components/agents/AgentModelsTab';
import AgentMcpUnavailable from '@/components/agents/AgentMcpUnavailable';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { isMcpAgent } from '@/utils/agent';

export default function AgentModelsPage() {
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);

  // The section is hidden from the agent's nav; this covers a direct link.
  if (isMcpAgent(agent.type)) {
    return <AgentMcpUnavailable agentId={agentId} section="models" />;
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentModelsTab agentId={agentId} agentType={agent.type} />
    </div>
  );
}
