'use client';

import { useSearchParams } from 'next/navigation';
import AgentWizard from '@/components/agent-wizard/AgentWizard';

export default function CreateAgentPage() {
  const teamId = useSearchParams().get('teamId');
  return <AgentWizard teamId={teamId} />;
}
