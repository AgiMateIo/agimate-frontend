'use client';

import { useParams } from 'next/navigation';
import AgentChannelsTab from '@/components/agents/AgentChannelsTab';

export default function AgentChannelsPage() {
  const agentId = useParams().id as string;
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentChannelsTab agentId={agentId} />
    </div>
  );
}
