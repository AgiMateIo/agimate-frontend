'use client';

import { useTranslations } from 'next-intl';
import TriggerLogsTab from '@/components/connectors/TriggerLogsTab';

export default function TriggerLogsPage() {
  const t = useTranslations('Connectors');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('triggerLogs')}</h1>
      </div>

      {/* Trigger Logs */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <TriggerLogsTab />
      </div>
    </div>
  );
}
