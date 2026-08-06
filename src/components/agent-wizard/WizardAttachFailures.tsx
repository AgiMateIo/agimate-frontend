'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import type { WizardFailure } from './AgentWizard';

// Connections and skills are attached after the agent exists, so a failure here
// leaves a real agent with less than was asked for. Naming what did not stick
// beats a green screen the user later finds out was a lie.
export default function WizardAttachFailures({
  connections,
  skills,
}: {
  connections: WizardFailure[];
  skills: WizardFailure[];
}) {
  const t = useTranslations('AgentWizard');
  if (connections.length === 0 && skills.length === 0) return null;

  const names = (rows: WizardFailure[]) => rows.map((r) => r.name).join(', ');

  return (
    <Alert variant="warning">
      {connections.length > 0 && <p>{t('bindFailed', { names: names(connections) })}</p>}
      {skills.length > 0 && <p>{t('skillBindFailed', { names: names(skills) })}</p>}
    </Alert>
  );
}
