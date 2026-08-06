'use client';

import { useParams } from 'next/navigation';
import AgentTriggerRunsTab from '@/components/agents/AgentTriggerRunsTab';
import AgentMcpUnavailable from '@/components/agents/AgentMcpUnavailable';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { isMcpAgent } from '@/utils/agent';

export default function AgentTriggersPage() {
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);

  // An MCP agent never lands among a trigger's recipients, bound connection or
  // not — the log would stay empty for a reason worth spelling out.
  if (isMcpAgent(agent.type)) {
    return <AgentMcpUnavailable agentId={agentId} section="triggers" />;
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentTriggerRunsTab agentId={agentId} />
    </div>
  );
}
