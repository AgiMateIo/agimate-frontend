'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import RunPageContent from '@/components/runs/RunPageContent';

export default function RunDetailPage() {
  const t = useTranslations('Runs');
  const runId = useParams().id as string;

  return (
    <RunPageContent runId={runId} backHref="/dashboard/runs" backLabel={t('backToRuns')} />
  );
}
