'use client';

import { useParams } from 'next/navigation';
import AgentModelsTab from '@/components/agents/AgentModelsTab';

export default function AgentModelsPage() {
  const agentId = useParams().id as string;
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentModelsTab agentId={agentId} />
    </div>
  );
}
