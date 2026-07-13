'use client';

import { useLocale, useTranslations } from 'next-intl';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import { useLlmUsageQuery } from '@/queries/llm-providers';

// Free-tier balance card for the dashboard home. Renders nothing unless the
// backend reports a platform (free-tier) entry with a daily quota — i.e. the
// installation has the platform provider enabled and this user is on it.
export default function PlatformUsageWidget() {
  const t = useTranslations('LlmUsage');
  const locale = useLocale();
  const bcp47 = localeMap[locale];
  const fmt = (n: number) => n.toLocaleString(bcp47);

  const { data } = useLlmUsageQuery();
  const day = data?.find((u) => u.source === 'PLATFORM')?.windows.find((w) => w.window === 'DAY');

  if (!day || day.limitTokens === null) return null;

  const pct = Math.min(100, Math.round((day.usedTokens / day.limitTokens) * 100));
  const nearLimit = pct >= 90;

  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted">
          <SparklesIcon className="h-5 w-5" />
          <span className="text-sm font-medium">{t('freeTierTitle')}</span>
        </div>
        <span className="text-sm font-mono text-foreground">
          {t('remainingToday', { remaining: fmt(day.remainingTokens ?? 0), limit: fmt(day.limitTokens) })}
        </span>
      </div>

      <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${nearLimit ? 'bg-warning' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <Link
        href="/dashboard/agents"
        className="inline-block text-sm text-accent hover:text-accent/80 font-medium transition-colors"
      >
        {t('connectOwnKey')} →
      </Link>
    </div>
  );
}
