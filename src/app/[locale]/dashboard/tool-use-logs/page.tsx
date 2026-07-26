'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import ToolUseLogsTab, {
  type AccessFilter,
  type StatusFilter,
} from '@/components/connectors/ToolUseLogsTab';

const parseStatus = (value: string | null): StatusFilter =>
  value === 'SUCCESS' || value === 'ERROR' || value === 'PENDING' ? value : 'ALL';

const parseAccess = (value: string | null): AccessFilter =>
  value === 'ALLOW' || value === 'DENY' ? value : 'ALL';

// `?status=` / `?access=` let the dashboard's attention panel link straight at
// the rows it is reporting.
function ToolUseLogs() {
  const searchParams = useSearchParams();

  return (
    <ToolUseLogsTab
      initialStatus={parseStatus(searchParams.get('status'))}
      initialAccess={parseAccess(searchParams.get('access'))}
    />
  );
}

export default function ToolUseLogsPage() {
  const t = useTranslations('Connectors');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('toolUseLogs')}</h1>
      </div>

      {/* Tool Use Logs */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <Suspense fallback={null}>
          <ToolUseLogs />
        </Suspense>
      </div>
    </div>
  );
}
