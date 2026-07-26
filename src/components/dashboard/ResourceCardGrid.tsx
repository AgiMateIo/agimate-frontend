'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { DashboardCount, DashboardResources } from '@/queries/dashboard';
import { RESOURCE_CARDS, type ResourceCardSpec } from './resources';

function ResourceCard({
  spec,
  data,
}: {
  spec: ResourceCardSpec;
  data: DashboardCount;
}) {
  const t = useTranslations('DashboardHome');
  const Icon = spec.icon;
  const empty = data.count === 0;
  const href = empty && spec.createHref ? spec.createHref : spec.href;

  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0 text-accent" />
        <span className="truncate text-sm font-medium text-muted">
          {t(spec.labelKey)}
        </span>
        {data.loading ? (
          <span className="ml-auto h-7 w-8 animate-pulse rounded-md bg-surface-secondary" />
        ) : data.error !== null ? (
          <span className="ml-auto text-2xl font-bold text-error">—</span>
        ) : (
          <span
            className={`ml-auto text-2xl font-bold leading-tight tabular-nums ${
              empty ? 'text-muted' : 'text-foreground'
            }`}
          >
            {data.count}
          </span>
        )}
      </div>

      {data.loading ? (
        <div className="h-4 w-24 animate-pulse rounded-md bg-surface-secondary" />
      ) : data.error !== null ? (
        <p className="truncate text-sm text-error">{data.error || t('loadFailed')}</p>
      ) : (
        <span className="truncate text-sm text-muted">
          {empty && <>{t(spec.emptyKey)} </>}
          <span className="font-medium text-accent transition-colors group-hover:text-accent/80">
            {empty ? t('create') : t('viewAll')} →
          </span>
        </span>
      )}
    </Link>
  );
}

export default function ResourceCardGrid({
  resources,
}: {
  resources: DashboardResources;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {RESOURCE_CARDS.map((spec) => (
        <ResourceCard key={spec.key} spec={spec} data={resources[spec.key]} />
      ))}
    </div>
  );
}
