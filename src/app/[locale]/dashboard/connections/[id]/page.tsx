'use client';

import { useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import type { ConnectionResponse } from '@/types';
import { formatDate } from '@/utils/date';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Tabs } from '@/components/ui/Tabs';
import { Toggle } from '@/components/ui/Toggle';
import {
  useConnectionDetailQuery,
  useUpdateConnectionMutation,
  useConnectionCacheActions,
} from '@/queries/connections';
import EditConnectionModal from '@/components/connections/EditConnectionModal';
import UpdateCredentialsModal from '@/components/connections/UpdateCredentialsModal';
import DeleteConnectionModal from '@/components/connections/DeleteConnectionModal';
import TestConnectionModal from '@/components/connections/TestConnectionModal';
import { Button } from '@/components/ui/Button';
import { PencilIcon, KeyIcon, TrashIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import ConnectionSkillsTab from '@/components/connections/ConnectionSkillsTab';
import ConnectionToolsTab from '@/components/connections/ConnectionToolsTab';
import ConnectionTriggersTab from '@/components/connections/ConnectionTriggersTab';
import ConnectionJobsTab from '@/components/connections/ConnectionJobsTab';

type Tab = 'info' | 'tools' | 'triggers' | 'jobs' | 'skills';

function ConnectionDetailContent({ id }: { id: string }) {
  const t = useTranslations('ConnectionDetail');
  const tInt = useTranslations('Connections');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const router = useRouter();

  const { data: { connection, connector } } = useConnectionDetailQuery(id);
  const updateMutation = useUpdateConnectionMutation(id);
  const { setConnection, invalidateConnection, removeConnection } = useConnectionCacheActions();

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [editingConnection, setEditingConnection] = useState(false);
  const [updatingCreds, setUpdatingCreds] = useState(false);
  const [deletingConnection, setDeletingConnection] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const handleToggleEnabled = () => {
    updateMutation.mutate({ enabled: !connection.enabled });
  };

  const handleEditSuccess = (updated: ConnectionResponse) => {
    setConnection(updated);
    setEditingConnection(false);
  };

  const handleUpdateCredsSuccess = (updated: ConnectionResponse) => {
    setConnection(updated);
    setUpdatingCreds(false);
  };

  const handleDeleteSuccess = () => {
    removeConnection(id);
    router.push('/dashboard/connections');
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {connection.name || connection.fullCode}
            </h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent/10 text-accent">
              {connector.name}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                connection.enabled
                  ? 'bg-success/10 text-success'
                  : 'bg-muted/10 text-muted'
              }`}
            >
              {connection.enabled ? tInt('enabled') : tInt('disabled')}
            </span>
          </div>
          <p className="text-sm text-muted mt-1 font-mono">{connection.fullCode}</p>
          {connection.name && (
            <p className="text-sm text-muted mt-1">
              {tInt('identifier')}: {connection.subCode}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setTestingConnection(true)}
            className="inline-flex items-center gap-2 !py-2 text-sm"
          >
            <BeakerIcon className="h-4 w-4" />
            {t('testConnection')}
          </Button>
          <Toggle
            checked={connection.enabled}
            onChange={handleToggleEnabled}
            disabled={updateMutation.isPending}
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
            onClick={() => setEditingConnection(true)}
            className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setDeletingConnection(true)}
            className="p-2 text-muted hover:text-error transition-colors rounded-lg"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'info',
            label: t('tabInfo'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-5">
                <h2 className="text-lg font-semibold text-foreground mb-4">{t('connectionInfo')}</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <dt className="text-sm text-muted">{t('platform')}</dt>
                    <dd className="text-foreground mt-0.5">{connector.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">{t('instanceHandle')}</dt>
                    <dd className="text-foreground mt-0.5 font-mono text-sm">{connection.fullCode}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">{t('platformIdentifier')}</dt>
                    <dd className="text-foreground mt-0.5 font-mono text-sm">{connection.subCode}</dd>
                  </div>
                  {connection.name && (
                    <div>
                      <dt className="text-sm text-muted">{tInt('name')}</dt>
                      <dd className="text-foreground mt-0.5">{connection.name}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-muted">{t('connectorCode')}</dt>
                    <dd className="text-foreground mt-0.5 font-mono text-sm">{connection.connectorCode}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">{t('status')}</dt>
                    <dd className="mt-0.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          connection.enabled
                            ? 'bg-success/10 text-success'
                            : 'bg-muted/10 text-muted'
                        }`}
                      >
                        {connection.enabled ? tInt('enabled') : tInt('disabled')}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">{tInt('created')}</dt>
                    <dd className="text-foreground mt-0.5">{formatDate(connection.createdAt, bcp47Locale)}</dd>
                  </div>
                  {connection.lastUsedAt && (
                    <div>
                      <dt className="text-sm text-muted">{tInt('lastUsed')}</dt>
                      <dd className="text-foreground mt-0.5">{formatDate(connection.lastUsedAt, bcp47Locale)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ),
          },
          {
            id: 'tools',
            label: t('tabTools'),
            content: <ConnectionToolsTab connectionId={connection.id} />,
          },
          {
            id: 'triggers',
            label: t('tabTriggers'),
            content: <ConnectionTriggersTab connectionId={connection.id} />,
          },
          {
            id: 'jobs',
            label: t('tabJobs'),
            content: <ConnectionJobsTab connectionId={connection.id} />,
          },
          {
            id: 'skills',
            label: t('tabSkills'),
            content: <ConnectionSkillsTab connectorCode={connection.connectorCode} />,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
      />

      {/* Modals */}
      {editingConnection && (
        <EditConnectionModal
          connection={connection}
          connectorName={connector.name}
          onClose={() => setEditingConnection(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingConnection && (
        <DeleteConnectionModal
          connection={connection}
          onClose={() => setDeletingConnection(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {updatingCreds && connector.integrationMeta && (
        <UpdateCredentialsModal
          connection={connection}
          credentialFields={connector.integrationMeta.credentialFields}
          onClose={() => setUpdatingCreds(false)}
          onSuccess={handleUpdateCredsSuccess}
        />
      )}

      {testingConnection && (
        <TestConnectionModal
          connectionId={connection.id}
          connectionName={connection.name || connection.fullCode}
          onClose={() => {
            setTestingConnection(false);
            invalidateConnection(id);
          }}
        />
      )}

    </>
  );
}

export default function ConnectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('ConnectionDetail');

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/connections"
        className="text-sm text-primary hover:text-primary/80 transition-colors"
      >
        &larr; {t('backToConnections')}
      </Link>

      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loading')}</div>}>
          <ConnectionDetailContent id={id} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
