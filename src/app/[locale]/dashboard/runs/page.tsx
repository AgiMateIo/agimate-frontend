'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import RunsList from '@/components/runs/RunsList';

// `?sessionId=` scopes the list to one conversation — how a chat outside an
// agent's own section would link at the work behind what was said. The list
// owns the notice that says so.
function Runs() {
  const sessionId = useSearchParams().get('sessionId') ?? undefined;

  return <RunsList sessionId={sessionId} clearSessionHref="/dashboard/runs" />;
}

export default function RunsPage() {
  const t = useTranslations('Runs');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('pageTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('pageSubtitle')}</p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <Suspense fallback={null}>
          <Runs />
        </Suspense>
      </div>
    </div>
  );
}
