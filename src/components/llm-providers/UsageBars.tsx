'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LlmUsageWindow } from '@/types';
import { localeMap } from '@/i18n/routing';

function useNumberFormat() {
  const locale = useLocale();
  const bcp47 = localeMap[locale];
  return (n: number) => n.toLocaleString(bcp47);
}

// A single day/month usage row. With a quota it renders a progress bar; without
// one (limitTokens === null) it shows raw spend only — there is nothing to fill.
export function UsageWindowRow({ window }: { window: LlmUsageWindow }) {
  const t = useTranslations('LlmUsage');
  const fmt = useNumberFormat();

  const label = t(window.window === 'DAY' ? 'windowDay' : 'windowMonth');
  const hasLimit = window.limitTokens !== null && window.limitTokens > 0;
  const pct = hasLimit
    ? Math.min(100, Math.round((window.usedTokens / (window.limitTokens as number)) * 100))
    : 0;
  const nearLimit = hasLimit && pct >= 90;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="text-foreground font-mono">
          {hasLimit
            ? t('usedOfLimit', { used: fmt(window.usedTokens), limit: fmt(window.limitTokens as number) })
            : t('usedNoLimit', { used: fmt(window.usedTokens) })}
        </span>
      </div>
      {hasLimit && (
        <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${nearLimit ? 'bg-warning' : 'bg-accent'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="text-xs text-muted">{t('requestsCount', { count: window.requests })}</div>
    </div>
  );
}

export function UsageBars({ windows }: { windows: LlmUsageWindow[] }) {
  // DAY first, then MONTH — stable order regardless of backend ordering.
  const ordered = [...windows].sort((a) => (a.window === 'DAY' ? -1 : 1));
  return (
    <div className="space-y-4">
      {ordered.map((w) => (
        <UsageWindowRow key={w.window} window={w} />
      ))}
    </div>
  );
}
