'use client';

import { useParams } from 'next/navigation';
import AgentTriggerRunsTab from '@/components/agents/AgentTriggerRunsTab';

export default function AgentTriggersPage() {
  const agentId = useParams().id as string;
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentTriggerRunsTab agentId={agentId} />
    </div>
  );
}
