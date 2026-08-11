'use client';

import { useTranslations } from 'next-intl';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Link } from '@/i18n/navigation';
import { useUpcomingJobs } from '@/queries/dashboard';
import type { ConnectorJobType } from '@/types';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';

// Same icon per schedule kind as the connector-jobs cards.
const TYPE_ICON: Record<ConnectorJobType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  PERIODIC: ArrowPathIcon,
  CRON: CalendarDaysIcon,
  ONETIME: ClockIcon,
};

export default function UpcomingJobs({
  refreshSeconds,
}: {
  refreshSeconds: number | null;
}) {
  const t = useTranslations('DashboardHome');
  const { jobs, loading, error } = useUpcomingJobs(refreshSeconds);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between gap-4 px-1">
        <h2 className="font-semibold text-foreground">{t('upcomingTitle')}</h2>
        <Link
          href="/dashboard/connector-jobs"
          className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
        >
          {t('viewAll')} →
        </Link>
      </div>

      {error !== null ? (
        <ErrorAlert>{error || t('loadFailed')}</ErrorAlert>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-secondary" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted">{t('upcomingEmpty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {jobs.map((job) => {
            const Icon = TYPE_ICON[job.type];

            return (
              <li key={job.id} className="flex items-center gap-3 px-1 py-2">
                <Icon className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{job.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {job.connectorCode}
                  </span>
                </span>
                <span
                  className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted"
                  title={job.nextRunAt ? formatDateTimeFull(job.nextRunAt) : undefined}
                >
                  {job.nextRunAt ? formatDateTimeShort(job.nextRunAt) : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
