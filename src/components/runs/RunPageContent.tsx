'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useRunSummary } from '@/queries/runs';
import RunDetail from './RunDetail';

// One run, on its own page. Two routes render it: /dashboard/runs/[id] and the
// same thing nested under an agent, so opening a run from the agent's section
// keeps the agent's sidebar instead of dropping the user back into the global
// nav. `backHref` is the only difference between them.
export default function RunPageContent({
  runId,
  backHref,
  backLabel,
}: {
  runId: string;
  backHref: string;
  backLabel: string;
}) {
  const t = useTranslations('Runs');
  // Free when a list sent us here (it primes its row), one request on a cold
  // open — either way the page shows the same thing.
  const { run, loading, error } = useRunSummary(runId);

  useSetBreadcrumb(runId, run?.name ?? `${runId.slice(0, 8)}…`);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {backLabel}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{run?.name ?? t('runDetailTitle')}</h1>
        <p className="font-mono text-xs text-muted">{runId}</p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <RunDetail runId={runId} run={run} summaryLoading={loading} summaryError={error} />
      </div>
    </div>
  );
}
