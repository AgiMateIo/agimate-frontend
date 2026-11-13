'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import AgentWizard from '@/components/agent-wizard/AgentWizard';
import { takePendingPreset } from '@/utils/pending-preset';

export default function CreateAgentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const teamId = searchParams.get('teamId');
  const preset = searchParams.get('preset');

  // An agent preset still waiting in storage is consumed here too, so opening
  // the wizard directly does not leave it to redirect the next dashboard visit.
  // A connection preset is deliberately left for its own page.
  useEffect(() => {
    const pending = takePendingPreset('agent');
    if (pending && !preset) {
      const query = new URLSearchParams(searchParams);
      query.set('preset', pending.name);
      router.replace(`/dashboard/agents/create?${query}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, []);

  return <AgentWizard teamId={teamId} presetName={preset} />;
}
