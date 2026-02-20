'use client';

import { useTranslations } from 'next-intl';
import ToolUseLogsTab from '@/components/apps/ToolUseLogsTab';

export default function ToolUseLogsPage() {
  const t = useTranslations('Apps');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('toolUseLogs')}</h1>
      </div>

      {/* Tool Use Logs */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <ToolUseLogsTab />
      </div>
    </div>
  );
}
