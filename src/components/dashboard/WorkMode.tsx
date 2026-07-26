'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { Link } from '@/i18n/navigation';
import type { DashboardResources, useAttentionSignals } from '@/queries/dashboard';
import AttentionPanel from './AttentionPanel';
import { RESOURCE_CARDS } from './resources';

/**
 * Dense working home. First slice: the counters as a one-line strip, so the
 * space goes to the blocks that follow (attention list, activity feed, upcoming
 * runs, LLM spend) rather than to six big cards.
 */
export default function WorkMode({
  resources,
  attention,
}: {
  resources: DashboardResources;
  attention: ReturnType<typeof useAttentionSignals>;
}) {
  const t = useTranslations('DashboardHome');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface px-5 py-3">
        {RESOURCE_CARDS.map((spec) => {
          const { count, loading, error } = resources[spec.key];

          return (
            <Link
              key={spec.key}
              href={spec.href}
              className="group flex items-baseline gap-2 text-sm"
            >
              <span className="text-muted transition-colors group-hover:text-foreground">
                {t(spec.labelKey)}
              </span>
              {loading ? (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-surface-secondary" />
              ) : error !== null ? (
                <span className="text-error">—</span>
              ) : (
                <span className="font-semibold tabular-nums text-foreground">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <AttentionPanel
        signals={attention.signals}
        loading={attention.loading}
        error={attention.error}
      />

      <Alert variant="info">
        <p className="text-sm font-medium">{t('workModeSoonTitle')}</p>
        <p className="mt-1 text-sm text-muted">{t('workModeSoonBody')}</p>
      </Alert>
    </div>
  );
}
