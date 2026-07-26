'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import { useLlmUsageQuery } from '@/queries/llm-providers';

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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

  // The ring shows what is left, not what is spent — this is a balance card.
  const remainingPct = Math.max(
    0,
    Math.min(100, Math.round(((day.remainingTokens ?? 0) / day.limitTokens) * 100)),
  );
  const low = remainingPct <= 10;

  return (
    <div className="flex items-center gap-5 rounded-xl border border-border bg-surface p-5">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            strokeWidth="6"
            className="stroke-surface-secondary"
          />
          <circle
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - remainingPct / 100)}
            className={`transition-all ${low ? 'stroke-warning' : 'stroke-accent'}`}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums ${
            low ? 'text-warning' : 'text-foreground'
          }`}
        >
          {remainingPct}%
        </span>
      </div>

      <div className="min-w-0">
        <div className="text-sm font-medium text-muted">{t('freeTierTitle')}</div>
        <div className="mt-0.5 text-foreground">
          {t('remainingToday', {
            remaining: fmt(day.remainingTokens ?? 0),
            limit: fmt(day.limitTokens),
          })}
        </div>
        <div className="mt-0.5 text-sm text-muted">
          {t('requestsCount', { count: day.requests })}
        </div>
        <Link
          href="/dashboard/llm-providers"
          className="mt-2 inline-block text-sm font-medium text-accent transition-colors hover:text-accent/80"
        >
          {t('connectOwnKey')} →
        </Link>
      </div>
    </div>
  );
}
