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
        onConnectConnector={(code) =>
          router.push(`/dashboard/agents/${agentId}/connections?bindConnector=${encodeURIComponent(code)}`)
        }
      />
    </div>
  );
}
