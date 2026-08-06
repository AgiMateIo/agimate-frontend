'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import AgentConnectionsTab from '@/components/agents/AgentConnectionsTab';

export default function AgentConnectionsPage() {
  const agentId = useParams().id as string;
  const router = useRouter();
  // Deep link that opens the bind modal on one connector (…?bindConnector=CODE).
  // The skills section fixes most of its own connectors in place now, so this is
  // for links from outside the agent rather than for that trail.
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
