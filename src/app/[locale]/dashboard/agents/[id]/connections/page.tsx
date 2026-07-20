'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import AgentConnectionsTab from '@/components/agents/AgentConnectionsTab';

export default function AgentConnectionsPage() {
  const agentId = useParams().id as string;
  const router = useRouter();
  // Preselect a connector in the bind modal when arriving from the skills page's
  // "waiting" badge (…/connections?bindConnector=CODE).
  const bindConnectorCode = useSearchParams().get('bindConnector');

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <AgentConnectionsTab
        agentId={agentId}
        bindConnectorCode={bindConnectorCode}
        onBindConnectorHandled={() => router.replace(`/dashboard/agents/${agentId}/connections`)}
      />
    </div>
  );
}
