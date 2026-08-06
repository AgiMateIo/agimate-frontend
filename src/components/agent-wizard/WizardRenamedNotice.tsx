'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';

// The server keeps agent names unique per user and appends a counter when the
// one you typed is taken ("External AI" → "External AI (2)"). Nothing in the
// response says it happened, so the wizard compares and says it out loud —
// otherwise the card here and the row in the list carry different names.
export default function WizardRenamedNotice({
  requested,
  actual,
}: {
  requested: string;
  actual: string;
}) {
  const t = useTranslations('AgentWizard');
  if (!requested || requested === actual) return null;

  return <Alert variant="info">{t('renamedNotice', { requested, actual })}</Alert>;
}
