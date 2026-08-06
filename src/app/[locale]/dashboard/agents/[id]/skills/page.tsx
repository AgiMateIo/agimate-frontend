'use client';

import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import AgentSkillsTab from '@/components/agents/AgentSkillsTab';

export default function AgentSkillsPage() {
  const agentId = useParams().id as string;
  const router = useRouter();
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentSkillsTab
        agentId={agentId}
        // Only reached when the user owns no instance of that connector at all:
        // the agent's own connections screen would offer an empty list, so the
        // trail leads to where a connection is actually created.
        onCreateConnection={() => router.push('/dashboard/connections')}
      />
    </div>
  );
}
