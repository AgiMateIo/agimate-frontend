'use client';

import { useTranslations } from 'next-intl';
import { UsageBars } from '@/components/llm-providers/UsageBars';
import { Link } from '@/i18n/navigation';
import { useLlmUsageQuery } from '@/queries/llm-providers';
import { Placeholder } from '@/components/ui/Placeholder';

/**
 * Token spend for every provider the user's agents run on, day and month.
 * The overview only ever shows the platform free tier; this is the full picture
 * for people who brought their own keys.
 */
export default function LlmSpend() {
  const t = useTranslations('DashboardHome');
  const tUsage = useTranslations('LlmUsage');
  const { data: usage, isPending } = useLlmUsageQuery();

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
        <h2 className="font-semibold text-foreground">{t('spendTitle')}</h2>
        <Link
          href="/dashboard/llm-providers"
          className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
        >
          {t('viewAll')} →
        </Link>
      </div>

      {isPending ? (
        <div className="h-20 animate-pulse rounded-lg bg-surface-secondary" />
      ) : !usage || usage.length === 0 ? (
        <Placeholder size="sm">{tUsage('noUsage')}</Placeholder>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {usage.map((entry) => (
            <div key={entry.llmProviderId ?? 'platform'} className="space-y-2 px-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {entry.source === 'PLATFORM'
                    ? tUsage('platformProviderName')
                    : entry.providerName}
                </span>
                {entry.source === 'PLATFORM' && (
                  <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {tUsage('platformBadge')}
                  </span>
                )}
              </div>
              <UsageBars windows={entry.windows} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
