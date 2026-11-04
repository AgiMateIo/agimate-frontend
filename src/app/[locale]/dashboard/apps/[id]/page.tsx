'use client';

import { useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Chip } from '@/components/ui/Chip';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { KeyIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAppDetailQuery, useAppCacheActions } from '@/queries/apps';
import { useConnectionSkillsQuery } from '@/queries/skills';
import RegenerateConnectorKeyModal from '@/components/connectors/RegenerateConnectorKeyModal';
import DeleteConnectorModal from '@/components/connectors/DeleteConnectorModal';
import { Placeholder } from '@/components/ui/Placeholder';
import { Button } from '@/components/ui/Button';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { appLabel } from '@/utils/app';

function ConnectorContent({ id }: { id: string }) {
  const t = useTranslations('Connectors');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const { data: connector } = useAppDetailQuery(id);
  const { removeAppFromLists } = useAppCacheActions();
  const label = appLabel(connector);
  useSetBreadcrumb(id, label ?? t('appNotConnected'));

  const [showRegenerate, setShowRegenerate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // The one skill this app brought — its origin names this very instance.
  const { skills, isPending: skillsPending, error: skillsError } =
    useConnectionSkillsQuery(connector.appId);
  const originSkill =
    skills.find((skill) => skill.origin?.connectionId === connector.appId) ?? null;

  const toolsCount = Object.keys(connector.tools ?? {}).length;
  const triggersCount = Object.keys(connector.triggers ?? {}).length;

  const handleDeleteSuccess = () => {
    removeAppFromLists(connector.appId);
    router.push('/dashboard/apps');
  };

  return (
    <>
      {/* Header. The name is not editable: the app declares it at link time. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{label ?? t('appNotConnected')}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Chip strong tone={connector.connected ? 'success' : 'muted'}>
              {connector.connected ? t('connected') : t('disconnected')}
            </Chip>
            {connector.version && (
              <Chip title={t('appVersion')}>
                {t('versionShort', { version: connector.version })}
              </Chip>
            )}
          </div>
          {connector.title && connector.code && (
            <p className="text-sm text-muted mt-1 font-mono">{connector.code}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRegenerate(true)}
            className="inline-flex items-center gap-2 !py-2 text-sm"
          >
            <KeyIcon className="h-4 w-4" />
            {t('regenerateKey')}
          </Button>
          <DropdownMenu
            items={[
              {
                label: tCommon('delete'),
                icon: TrashIcon,
                onClick: () => setShowDelete(true),
                danger: true,
              },
            ]}
          />
        </div>
      </div>

      {/* Key and device are this page's own subject; what the app can do is the
          connection's, and lives one link away. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('keyAndDevice')}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-sm text-muted">{t('appId')}</dt>
              <dd className="text-foreground mt-0.5 font-mono text-sm break-all">{connector.appId}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t('status')}</dt>
              <dd className="mt-0.5">
                <Chip strong tone={connector.connected ? 'success' : 'muted'}>
                  {connector.connected ? t('connected') : t('disconnected')}
                </Chip>
              </dd>
            </div>
            {connector.deviceId && (
              <div>
                <dt className="text-sm text-muted">{t('deviceId')}</dt>
                <dd className="text-foreground mt-0.5 font-mono text-sm break-all">{connector.deviceId}</dd>
              </div>
            )}
            {connector.deviceName && (
              <div>
                <dt className="text-sm text-muted">{t('deviceName')}</dt>
                <dd className="text-foreground mt-0.5">{connector.deviceName}</dd>
              </div>
            )}
            {connector.deviceOs && (
              <div>
                <dt className="text-sm text-muted">{t('deviceOs')}</dt>
                <dd className="text-foreground mt-0.5">{connector.deviceOs}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('integration')}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-sm text-muted">{t('tools')}</dt>
              <dd className="text-foreground mt-0.5">{toolsCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t('triggers')}</dt>
              <dd className="text-foreground mt-0.5">{triggersCount}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted">{t('skill')}</dt>
              <dd className="text-foreground mt-0.5">
                {skillsPending ? (
                  <span className="text-muted">…</span>
                ) : skillsError ? (
                  <span className="text-muted">—</span>
                ) : originSkill ? (
                  <Link
                    href={`/dashboard/skills/${originSkill.id}`}
                    className="text-primary hover:underline"
                  >
                    {originSkill.title}
                  </Link>
                ) : (
                  <span className="text-muted">{t('noAppSkill')}</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t border-border">
            <Link
              href={`/dashboard/connections/${connector.appId}`}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t('openConnection')}
            </Link>
          </div>
        </section>
      </div>

      {/* The raw declaration is for support, not the everyday path. */}
      {connector.info && Object.keys(connector.info).length > 0 && (
        <details className="bg-surface rounded-xl border border-border p-5">
          <summary className="cursor-pointer select-none text-sm text-muted hover:text-foreground">
            {t('deviceInfo')}
          </summary>
          <pre className="mt-3 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto">
            {JSON.stringify(connector.info, null, 2)}
          </pre>
        </details>
      )}

      {/* Modals */}
      {showRegenerate && (
        <RegenerateConnectorKeyModal
          connectorId={connector.appId}
          connectorName={label}
          onClose={() => setShowRegenerate(false)}
          onSuccess={() => setShowRegenerate(false)}
        />
      )}

      {showDelete && (
        <DeleteConnectorModal
          connector={{ id: connector.appId, title: connector.title, code: connector.code }}
          onClose={() => setShowDelete(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}

export default function ConnectorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Connectors');

  return (
    <div className="space-y-6">
      {/* Back link — always visible */}
      <Link
        href="/dashboard/apps"
        className="text-sm text-primary hover:text-primary/80 transition-colors"
      >
        &larr; {t('backToApps')}
      </Link>

      <ErrorBoundary resetKeys={[id]}>
        <Suspense fallback={<Placeholder>{t('loadingApp')}</Placeholder>}>
          <ConnectorContent id={id} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
