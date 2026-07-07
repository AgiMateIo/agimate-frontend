'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  DevicePhoneMobileIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { appsListOptions } from '@/queries/apps';
import { agentsListOptions } from '@/queries/agents';
import { getErrorMessage } from '@/utils/error';

interface ResourceCard {
  key: string;
  nameKey: 'apps' | 'agents';
  emptyKey: 'noApps' | 'noAgents';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  count: number | null;
  error: string | null;
}

export default function DashboardPage() {
  const t = useTranslations('DashboardHome');
  const appsQuery = useQuery(appsListOptions());
  const agentsQuery = useQuery(agentsListOptions());
  const loading = appsQuery.isPending || agentsQuery.isPending;

  const resources: ResourceCard[] = [
    {
      key: 'connectors',
      nameKey: 'apps',
      emptyKey: 'noApps',
      icon: DevicePhoneMobileIcon,
      href: '/dashboard/apps',
      count: appsQuery.data?.totalElements ?? null,
      error: appsQuery.error ? getErrorMessage(appsQuery.error, 'Error') : null,
    },
    {
      key: 'agents',
      nameKey: 'agents',
      emptyKey: 'noAgents',
      icon: SparklesIcon,
      href: '/dashboard/agents',
      count: agentsQuery.data?.totalElements ?? null,
      error: agentsQuery.error ? getErrorMessage(agentsQuery.error, 'Error') : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="bg-surface rounded-xl border border-border p-6 flex flex-col"
            >
              <div className="flex items-center gap-2 text-muted mb-4">
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{t(card.nameKey)}</span>
              </div>

              {loading ? (
                <div className="flex-1 flex items-end">
                  <span className="text-sm text-muted">{t('loadingResources')}</span>
                </div>
              ) : card.error ? (
                <div className="flex-1 flex items-end">
                  <span className="text-sm text-error">{card.error}</span>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <span className={`text-3xl font-bold ${card.count === 0 ? 'text-muted' : 'text-foreground'}`}>
                      {card.count}
                    </span>
                  </div>
                  <div className="mt-4">
                    {(card.count ?? 0) > 0 ? (
                      <Link
                        href={card.href}
                        className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                      >
                        {t('viewAll')} →
                      </Link>
                    ) : (
                      <div>
                        <p className="text-sm text-muted mb-1">{t(card.emptyKey)}</p>
                        <Link
                          href={card.href}
                          className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                        >
                          {t('create')} →
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
