'use client';

import { useParams } from 'next/navigation';
import AgentViewsTab from '@/components/agents/AgentViewsTab';

export default function AgentViewsPage() {
  const agentId = useParams().id as string;
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentViewsTab agentId={agentId} />
    </div>
  );
}
