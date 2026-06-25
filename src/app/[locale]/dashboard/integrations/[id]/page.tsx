'use client';

import { useState, Suspense, use } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import apiService from '@/services/api';
import type { IntegrationResponse, ConnectorCatalogEntry } from '@/types';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import { Toggle } from '@/components/ui/Toggle';
import EditIntegrationModal from '@/components/integrations/EditIntegrationModal';
import UpdateCredentialsModal from '@/components/integrations/UpdateCredentialsModal';
import DeleteIntegrationModal from '@/components/integrations/DeleteIntegrationModal';
import TestIntegrationModal from '@/components/integrations/TestIntegrationModal';
import IntegrationToolsModal from '@/components/integrations/IntegrationToolsModal';
import { Button } from '@/components/ui/Button';
import { PencilIcon, KeyIcon, TrashIcon, BeakerIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import IntegrationSkillsTab from '@/components/integrations/IntegrationSkillsTab';

type Tab = 'info' | 'skills';

function IntegrationDetailContent({
  dataPromise,
  onUpdate,
}: {
  dataPromise: Promise<[IntegrationResponse, ConnectorCatalogEntry]>;
  onUpdate: () => void;
}) {
  const t = useTranslations('IntegrationDetail');
  const tInt = useTranslations('Integrations');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const router = useRouter();

  const [initialIntegration, connector] = use(dataPromise);
  const [integration, setIntegration] = useState(initialIntegration);
  const [lastInitial, setLastInitial] = useState(initialIntegration);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [updating, setUpdating] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(false);
  const [updatingCreds, setUpdatingCreds] = useState(false);
  const [deletingIntegration, setDeletingIntegration] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState(false);
  const [showingTools, setShowingTools] = useState(false);

  if (initialIntegration !== lastInitial) {
    setLastInitial(initialIntegration);
    setIntegration(initialIntegration);
  }

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

  const handleToggleEnabled = async () => {
    setUpdating(true);
    const newEnabled = !integration.enabled;
    setIntegration(prev => ({ ...prev, enabled: newEnabled }));

    try {
      await apiService.updateIntegration(integration.id, { enabled: newEnabled });
    } catch (error) {
      console.error('Failed to update integration:', error);
      setIntegration(prev => ({ ...prev, enabled: !newEnabled }));
    } finally {
      setUpdating(false);
    }
  };

  const handleEditSuccess = (updated: IntegrationResponse) => {
    setIntegration(updated);
    setEditingIntegration(false);
  };

  const handleUpdateCredsSuccess = (updated: IntegrationResponse) => {
    setIntegration(updated);
    setUpdatingCreds(false);
  };

  const handleDeleteSuccess = (_integrationId: string) => {
    router.push('/dashboard/integrations');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: t('tabInfo') },
    { key: 'skills', label: t('tabSkills') },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {integration.name || integration.fullCode}
            </h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent/10 text-accent">
              {connector.name}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                integration.enabled
                  ? 'bg-success/10 text-success'
                  : 'bg-muted/10 text-muted'
              }`}
            >
              {integration.enabled ? tInt('enabled') : tInt('disabled')}
            </span>
          </div>
          <p className="text-sm text-muted mt-1 font-mono">{integration.fullCode}</p>
          {integration.name && (
            <p className="text-sm text-muted mt-1">
              {tInt('identifier')}: {integration.subCode}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setTestingIntegration(true)}
            className="inline-flex items-center gap-2 !py-2 text-sm"
          >
            <BeakerIcon className="h-4 w-4" />
            {t('testIntegration')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowingTools(true)}
            className="inline-flex items-center gap-2 !py-2 text-sm"
          >
            <WrenchScrewdriverIcon className="h-4 w-4" />
            {t('toolsTitle')}
          </Button>
          <Toggle
            checked={integration.enabled}
            onChange={handleToggleEnabled}
            disabled={updating}
          />
          {connector.integrationMeta && (
            <button
              onClick={() => setUpdatingCreds(true)}
              className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
              title={tInt('updateCredentials')}
            >
              <KeyIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => setEditingIntegration(true)}
            className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setDeletingIntegration(true)}
            className="p-2 text-muted hover:text-error transition-colors rounded-lg"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('integrationInfo')}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-sm text-muted">{t('platform')}</dt>
              <dd className="text-foreground mt-0.5">{connector.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t('instanceHandle')}</dt>
              <dd className="text-foreground mt-0.5 font-mono text-sm">{integration.fullCode}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t('platformIdentifier')}</dt>
              <dd className="text-foreground mt-0.5 font-mono text-sm">{integration.subCode}</dd>
            </div>
            {integration.name && (
              <div>
                <dt className="text-sm text-muted">{tInt('name')}</dt>
                <dd className="text-foreground mt-0.5">{integration.name}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted">{t('connectorCode')}</dt>
              <dd className="text-foreground mt-0.5 font-mono text-sm">{integration.connectorCode}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t('status')}</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    integration.enabled
                      ? 'bg-success/10 text-success'
                      : 'bg-muted/10 text-muted'
                  }`}
                >
                  {integration.enabled ? tInt('enabled') : tInt('disabled')}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{tInt('created')}</dt>
              <dd className="text-foreground mt-0.5">{formatDate(integration.createdAt)}</dd>
            </div>
            {integration.lastUsedAt && (
              <div>
                <dt className="text-sm text-muted">{tInt('lastUsed')}</dt>
                <dd className="text-foreground mt-0.5">{formatDate(integration.lastUsedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {activeTab === 'skills' && (
        <IntegrationSkillsTab connectorCode={integration.connectorCode} />
      )}

      {/* Modals */}
      {editingIntegration && (
        <EditIntegrationModal
          integration={integration}
          connectorName={connector.name}
          onClose={() => setEditingIntegration(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingIntegration && (
        <DeleteIntegrationModal
          integration={integration}
          onClose={() => setDeletingIntegration(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {updatingCreds && connector.integrationMeta && (
        <UpdateCredentialsModal
          integration={integration}
          credentialFields={connector.integrationMeta.credentialFields}
          onClose={() => setUpdatingCreds(false)}
          onSuccess={handleUpdateCredsSuccess}
        />
      )}

      {testingIntegration && (
        <TestIntegrationModal
          integrationId={integration.id}
          integrationName={integration.name || integration.fullCode}
          onClose={() => {
            setTestingIntegration(false);
            onUpdate();
          }}
        />
      )}

      {showingTools && (
        <IntegrationToolsModal
          integrationId={integration.id}
          integrationName={integration.name || integration.fullCode}
          onClose={() => setShowingTools(false)}
        />
      )}
    </>
  );
}

export default function IntegrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('IntegrationDetail');
  const { promise, invalidate } = usePromiseCache(
    () => apiService.getIntegrationCredential(id).then(async (integration) => {
      const connector = await apiService.getConnector(integration.connectorCode);
      return [integration, connector] as [IntegrationResponse, ConnectorCatalogEntry];
    }),
    [id],
    'integration-detail'
  );

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/integrations"
        className="text-sm text-primary hover:text-primary/80 transition-colors"
      >
        &larr; {t('backToIntegrations')}
      </Link>

      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loading')}</div>}>
          <IntegrationDetailContent dataPromise={promise} onUpdate={invalidate} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
