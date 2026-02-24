'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  PuzzlePieceIcon,
  DevicePhoneMobileIcon,
  KeyIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/services/api';

interface ResourceCard {
  key: string;
  nameKey: string;
  emptyKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  count: number | null;
  error: string | null;
}

export default function DashboardPage() {
  const t = useTranslations('DashboardHome');
  const [resources, setResources] = useState<ResourceCard[]>([
    { key: 'credentials', nameKey: 'credentials', emptyKey: 'noCredentials', icon: PuzzlePieceIcon, href: '/dashboard/connectors', count: null, error: null },
    { key: 'apps', nameKey: 'apps', emptyKey: 'noApps', icon: DevicePhoneMobileIcon, href: '/dashboard/apps', count: null, error: null },
    { key: 'agents', nameKey: 'agents', emptyKey: 'noAgents', icon: SparklesIcon, href: '/dashboard/agents', count: null, error: null },
    { key: 'apiKeys', nameKey: 'apiKeys', emptyKey: 'noApiKeys', icon: KeyIcon, href: '/dashboard/api-keys', count: null, error: null },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    const results = await Promise.allSettled([
      apiService.getCredentialsSummary().then(summaries =>
        summaries.reduce((sum, s) => sum + s.credentialCount, 0)
      ),
      apiService.getApps().then(d => d.length),
      apiService.getAgentsList().then(a => a.length),
      apiService.getConnectorsApiKeys().then(k => k.length),
    ]);

    setResources(prev =>
      prev.map((card, i) => ({
        ...card,
        count: results[i].status === 'fulfilled' ? results[i].value : null,
        error: results[i].status === 'rejected'
          ? (results[i].reason instanceof Error ? results[i].reason.message : 'Error')
          : null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    {card.count! > 0 ? (
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
