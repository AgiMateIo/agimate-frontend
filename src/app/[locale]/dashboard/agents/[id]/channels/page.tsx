'use client';

import { useParams } from 'next/navigation';
import AgentChannelsTab from '@/components/agents/AgentChannelsTab';
import AgentMcpUnavailable from '@/components/agents/AgentMcpUnavailable';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { isMcpAgent } from '@/utils/agent';

export default function AgentChannelsPage() {
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);

  // The backend refuses to create a channel for an MCP agent (400) — offering
  // the form would only produce that error.
  if (isMcpAgent(agent.type)) {
    return <AgentMcpUnavailable agentId={agentId} section="channels" />;
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentChannelsTab agentId={agentId} />
    </div>
  );
}
