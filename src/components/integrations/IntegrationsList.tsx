'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import apiService from '@/services/api';
import { IntegrationResponse, ConnectorCatalogEntry } from '@/types';
import { TrashIcon, PencilIcon, KeyIcon } from '@heroicons/react/24/outline';
import { Toggle } from '@/components/ui/Toggle';
import DeleteIntegrationModal from './DeleteIntegrationModal';
import EditIntegrationModal from './EditIntegrationModal';
import UpdateCredentialsModal from './UpdateCredentialsModal';

interface IntegrationsListProps {
  integrations: IntegrationResponse[];
  platforms: ConnectorCatalogEntry[];
  onUpdate: (integrations: IntegrationResponse[]) => void;
}

export default function IntegrationsList({
  integrations,
  platforms,
  onUpdate,
}: IntegrationsListProps) {
  const t = useTranslations('Integrations');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];

  const [editingIntegration, setEditingIntegration] = useState<IntegrationResponse | null>(null);
  const [deletingIntegration, setDeletingIntegration] = useState<IntegrationResponse | null>(null);
  const [updatingCredsIntegration, setUpdatingCredsIntegration] = useState<IntegrationResponse | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

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

  const handleToggleEnabled = async (integration: IntegrationResponse) => {
    setUpdatingIds(prev => new Set(prev).add(integration.id));

    const newEnabled = !integration.enabled;
    onUpdate(integrations.map(i =>
      i.id === integration.id ? { ...i, enabled: newEnabled } : i
    ));

    try {
      await apiService.updateIntegration(integration.id, { enabled: newEnabled });
    } catch (error) {
      console.error('Failed to update integration:', error);
      onUpdate(integrations.map(i =>
        i.id === integration.id ? { ...i, enabled: integration.enabled } : i
      ));
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(integration.id);
        return next;
      });
    }
  };

  const handleDeleteSuccess = (integrationId: string) => {
    onUpdate(integrations.filter(i => i.id !== integrationId));
    setDeletingIntegration(null);
  };

  const handleEditSuccess = (updated: IntegrationResponse) => {
    onUpdate(integrations.map(i => i.id === updated.id ? updated : i));
    setEditingIntegration(null);
  };

  const handleUpdateCredsSuccess = (updated: IntegrationResponse) => {
    onUpdate(integrations.map(i => i.id === updated.id ? updated : i));
    setUpdatingCredsIntegration(null);
  };

  if (integrations.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        {t('noIntegrations')}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {integrations.map((integration) => {
          const connector = getConnector(integration.connectorCode);

          return (
            <div
              key={integration.id}
              className="bg-surface-secondary rounded-lg p-4 border border-border"
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  href={`/dashboard/integrations/${integration.id}`}
                  className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      {connector?.name ?? integration.connectorCode}
                    </span>
                  </div>
                  <h3 className="font-medium text-foreground mt-1">
                    {integration.name || integration.platformIdentifier}
                  </h3>
                  {integration.name && (
                    <p className="text-sm text-muted mt-0.5">
                      {t('identifier')}: {integration.platformIdentifier}
                    </p>
                  )}
                  <div className="text-xs text-muted mt-2 space-y-1">
                    <p>{t('created')}: {formatDate(integration.createdAt)}</p>
                    {integration.lastUsedAt && (
                      <p>{t('lastUsed')}: {formatDate(integration.lastUsedAt)}</p>
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <Toggle
                    checked={integration.enabled}
                    onChange={() => handleToggleEnabled(integration)}
                    disabled={updatingIds.has(integration.id)}
                  />

                  {connector?.integrationMeta && (
                    <button
                      onClick={() => setUpdatingCredsIntegration(integration)}
                      className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                      title={t('updateCredentials')}
                    >
                      <KeyIcon className="h-5 w-5" />
                    </button>
                  )}

                  <button
                    onClick={() => setEditingIntegration(integration)}
                    className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setDeletingIntegration(integration)}
                    className="p-2 text-muted hover:text-error transition-colors rounded-lg"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingIntegration && (
        <EditIntegrationModal
          integration={editingIntegration}
          connectorName={getConnector(editingIntegration.connectorCode)?.name ?? editingIntegration.connectorCode}
          onClose={() => setEditingIntegration(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingIntegration && (
        <DeleteIntegrationModal
          integration={deletingIntegration}
          onClose={() => setDeletingIntegration(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {updatingCredsIntegration && (() => {
        const connector = getConnector(updatingCredsIntegration.connectorCode);
        return connector?.integrationMeta ? (
          <UpdateCredentialsModal
            integration={updatingCredsIntegration}
            credentialFields={connector.integrationMeta.credentialFields}
            onClose={() => setUpdatingCredsIntegration(null)}
            onSuccess={handleUpdateCredsSuccess}
          />
        ) : null;
      })()}
    </>
  );
}
