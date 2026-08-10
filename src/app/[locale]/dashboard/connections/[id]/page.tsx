'use client';

import { useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import type { ConnectionResponse } from '@/types';
import { formatDate } from '@/utils/date';
import { Alert } from '@/components/ui/Alert';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Tabs } from '@/components/ui/Tabs';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { isInternalConnector } from '@/utils/connector';
import {
  useConnectionDetailQuery,
  useUpdateConnectionMutation,
  useConnectionCacheActions,
} from '@/queries/connections';
import UpdateCredentialsModal from '@/components/connections/UpdateCredentialsModal';
import DeleteConnectionModal from '@/components/connections/DeleteConnectionModal';
import TestConnectionModal from '@/components/connections/TestConnectionModal';
import { Button } from '@/components/ui/Button';
import ConnectionTitle from '@/components/connections/ConnectionTitle';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { KeyIcon, TrashIcon, BeakerIcon, PowerIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import {
  ConnectionAuthBadge,
  ConnectionAuthPanel,
  needsAuthorization,
} from '@/components/connections/ConnectionAuth';
import ConnectionAgentsTab from '@/components/connections/ConnectionAgentsTab';
import ConnectionSkillsTab from '@/components/connections/ConnectionSkillsTab';
import ConnectionToolsTab from '@/components/connections/ConnectionToolsTab';
import ConnectionTriggersTab from '@/components/connections/ConnectionTriggersTab';
import ConnectionJobsTab from '@/components/connections/ConnectionJobsTab';

type Tab = 'info' | 'tools' | 'triggers' | 'jobs' | 'skills' | 'agents';

function ConnectionDetailContent({ id }: { id: string }) {
  const t = useTranslations('ConnectionDetail');
  const tInt = useTranslations('Connections');
  const tAuth = useTranslations('ConnectionAuth');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const router = useRouter();
  // Set by the OAuth callback screen when it hands the user back here.
  const justAuthorized = useSearchParams().get('authorized') === '1';

  const { data: { connection, connector } } = useConnectionDetailQuery(id);
  useSetBreadcrumb(id, connection.name || connection.fullCode);
  // Internal-connector rows are system-managed (one per user, recreated by the
  // skills sync) — deleting them from the UI makes no sense.
  const internal = isInternalConnector(connector);
  const updateMutation = useUpdateConnectionMutation(id);
  const { setConnection, invalidateConnection, removeConnection } = useConnectionCacheActions();

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [updatingCreds, setUpdatingCreds] = useState(false);
  const [deletingConnection, setDeletingConnection] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const handleToggleEnabled = () => {
    updateMutation.mutate({ enabled: !connection.enabled });
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
      {/* Header. Five equal-weight controls in one row read as a toolbar with no
          hierarchy, and their combined min-width scrolled the page sideways.
          Now: the name is edited in place, "test" is the one visible button,
          and every remaining action (enable/disable, credentials, delete)
          lives in the overflow menu. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <ConnectionTitle
            name={connection.name}
            fallback={connection.fullCode}
            onSave={(name) => updateMutation.mutateAsync({ name })}
          />
          {/* Identity and state wrap together — a connector name next to two
              badges never fits one phone row. State is read here and changed
              from the menu, so nothing in this row is interactive. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent/10 text-accent">
              {connector.name}
            </span>
            <ConnectionAuthBadge status={connection.authStatus} />
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                connection.enabled ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
              }`}
            >
              {connection.enabled ? tInt('enabled') : tInt('disabled')}
            </span>
          </div>
          <p className="text-sm text-muted mt-1 font-mono">{connection.fullCode}</p>
          {connection.name && connection.subCode && (
            <p className="text-sm text-muted mt-1">
              {tInt('identifier')}: {connection.subCode}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setTestingConnection(true)}
            className="inline-flex items-center gap-2 !py-2 text-sm"
          >
            <BeakerIcon className="h-4 w-4" />
            {t('testConnection')}
          </Button>
          <DropdownMenu
            items={[
              {
                label: connection.enabled ? t('disableConnection') : t('enableConnection'),
                icon: PowerIcon,
                onClick: handleToggleEnabled,
                disabled: updateMutation.isPending,
              },
              ...(connector.integrationMeta
                ? [
                    {
                      label: tInt('updateCredentials'),
                      icon: KeyIcon,
                      onClick: () => setUpdatingCreds(true),
                    },
                  ]
                : []),
              // Internal-connector rows are system-managed, so they have no
              // delete entry at all rather than a disabled one.
              ...(internal
                ? []
                : [
                    {
                      label: tCommon('delete'),
                      icon: TrashIcon,
                      onClick: () => setDeletingConnection(true),
                      danger: true,
                      separated: true,
                    },
                  ]),
            ]}
          />
        </div>
      </div>

      {/* The connection is inert until the grant is in place — say so before the
          tabs, where the empty tool list would otherwise read as a bug. */}
      <ConnectionAuthPanel connectionId={connection.id} status={connection.authStatus} />

      {/* Arrived here straight from the provider's consent screen. */}
      {justAuthorized && !needsAuthorization(connection.authStatus) && (
        <Alert variant="success">{tAuth('completed')}</Alert>
      )}

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
                    <dd className="text-foreground mt-0.5 font-mono text-sm">{connection.subCode ?? '—'}</dd>
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
                  {needsAuthorization(connection.authStatus) && (
                    <div>
                      <dt className="text-sm text-muted">{tAuth('label')}</dt>
                      <dd className="mt-0.5">
                        <ConnectionAuthBadge status={connection.authStatus} />
                      </dd>
                    </div>
                  )}
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
          {
            id: 'agents',
            label: t('tabAgents'),
            content: (
              <ConnectionAgentsTab
                connectionId={connection.id}
                canBind={!!connector.integrationMeta}
              />
            ),
          },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
      />

      {/* Modals */}
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

      <ErrorBoundary resetKeys={[id]}>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loading')}</div>}>
          <ConnectionDetailContent id={id} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
