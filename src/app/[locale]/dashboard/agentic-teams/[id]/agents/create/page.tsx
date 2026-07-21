'use client';

import { useParams } from 'next/navigation';
import AgentWizard from '@/components/agent-wizard/AgentWizard';

// Team-scoped agent creation: same wizard as /dashboard/agents/create, but the
// route stays under the team so the contextual sidebar doesn't reset.
export default function TeamCreateAgentPage() {
  const teamId = useParams().id as string;
  return <AgentWizard teamId={teamId} />;
}
