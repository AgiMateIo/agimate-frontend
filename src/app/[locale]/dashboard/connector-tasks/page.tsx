'use client';

import { useTranslations } from 'next-intl';
import ConnectorTasksTab from '@/components/connectors/ConnectorTasksTab';

export default function ConnectorTasksPage() {
  const t = useTranslations('ConnectorTasks');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
      </div>

      {/* Connector Tasks */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <ConnectorTasksTab />
      </div>
    </div>
  );
}
