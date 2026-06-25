'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import { IntegrationResponse, ConnectorCatalogEntry } from '@/types';

interface IntegrationsListProps {
  integrations: IntegrationResponse[];
  platforms: ConnectorCatalogEntry[];
  onUpdate: (integrations: IntegrationResponse[]) => void;
}

export default function IntegrationsList({
  integrations,
  platforms,
}: IntegrationsListProps) {
  const t = useTranslations('Integrations');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];

  const getConnector = (code: string) => platforms.find(p => p.code === code);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString.replace(' ', 'T'));
    return new Intl.DateTimeFormat(bcp47Locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (integrations.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        {t('noIntegrations')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {integrations.map((integration) => {
        const connector = getConnector(integration.connectorCode);

        return (
          <Link
            key={integration.id}
            href={`/dashboard/integrations/${integration.id}`}
            className="block bg-surface-secondary rounded-lg p-4 border border-border hover:border-accent transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {connector?.name ?? integration.connectorCode}
                  </span>
                </div>
                <h3 className="font-medium text-foreground mt-1">
                  {integration.name || integration.fullCode}
                </h3>
                {integration.name && (
                  <p className="text-xs text-muted mt-0.5 font-mono">{integration.fullCode}</p>
                )}
                <p className="text-sm text-muted mt-0.5">
                  {t('identifier')}: {integration.subCode}
                </p>
                <div className="text-xs text-muted mt-2 space-y-1">
                  <p>{t('created')}: {formatDate(integration.createdAt)}</p>
                  {integration.lastUsedAt && (
                    <p>{t('lastUsed')}: {formatDate(integration.lastUsedAt)}</p>
                  )}
                </div>
              </div>

              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  integration.enabled
                    ? 'bg-success/10 text-success'
                    : 'bg-muted/10 text-muted'
                }`}
              >
                {integration.enabled ? t('enabled') : t('disabled')}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
