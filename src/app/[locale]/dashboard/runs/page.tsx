'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import RunsList from '@/components/runs/RunsList';

// `?sessionId=` opens the list scoped to one conversation — how the chat links
// at the work behind what was said. It is a URL-only filter (there is nothing to
// pick from in a dropdown), so it gets a notice with a way out instead.
function Runs() {
  const t = useTranslations('Runs');
  const sessionId = useSearchParams().get('sessionId') ?? undefined;

  return (
    <div className="space-y-4">
      {sessionId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <span>{t('sessionScopeNotice')}</span>
          <Link
            href="/dashboard/runs"
            className="ml-auto flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
            {t('showAllRuns')}
          </Link>
        </div>
      )}
      <RunsList sessionId={sessionId} />
    </div>
  );
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
