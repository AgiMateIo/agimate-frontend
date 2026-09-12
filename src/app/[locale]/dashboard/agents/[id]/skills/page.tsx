'use client';

import { useParams } from 'next/navigation';
import AgentSkillsTab from '@/components/agents/AgentSkillsTab';

export default function AgentSkillsPage() {
  const agentId = useParams().id as string;
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentSkillsTab agentId={agentId} />
    </div>
  );
}
