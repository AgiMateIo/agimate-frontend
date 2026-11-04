'use client';

import { useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Chip } from '@/components/ui/Chip';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAppDetailQuery } from '@/queries/apps';
import RegenerateConnectorKeyModal from '@/components/connectors/RegenerateConnectorKeyModal';
import { Placeholder } from '@/components/ui/Placeholder';
import { Button } from '@/components/ui/Button';
import { appLabel } from '@/utils/app';

function ConnectorContent({ id }: { id: string }) {
  const t = useTranslations('Connectors');
  const { data: connector } = useAppDetailQuery(id);
  const label = appLabel(connector);
  useSetBreadcrumb(id, label ?? t('appNotConnected'));
  const [showRegenerate, setShowRegenerate] = useState(false);

  const handleRegenerateSuccess = () => {
    setShowRegenerate(false);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{label ?? t('appNotConnected')}</h1>
        <Chip strong tone={connector.connected ? 'success' : 'muted'}>
          {connector.connected ? t('connected') : t('disconnected')}
        </Chip>
      </div>

      {/* Connector Info */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('appInfo')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <dt className="text-sm text-muted">{t('appName')}</dt>
            <dd className="text-foreground mt-0.5">{label ?? t('appNotConnected')}</dd>
          </div>
          {connector.code && (
            <div>
              <dt className="text-sm text-muted">{t('appCode')}</dt>
              <dd className="text-foreground mt-0.5 font-mono text-sm">{connector.code}</dd>
            </div>
          )}
          {connector.version && (
            <div>
              <dt className="text-sm text-muted">{t('appVersion')}</dt>
              <dd className="text-foreground mt-0.5">{connector.version}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-muted">{t('appId')}</dt>
            <dd className="text-foreground mt-0.5 font-mono text-sm">{connector.appId}</dd>
          </div>
          {connector.deviceId && (
            <div>
              <dt className="text-sm text-muted">{t('deviceId')}</dt>
              <dd className="text-foreground mt-0.5 font-mono text-sm">{connector.deviceId}</dd>
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

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setShowRegenerate(true)}>
            {t('regenerateKey')}
          </Button>
        </div>
      </div>

      {/* Device info */}
      {connector.info && Object.keys(connector.info).length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('deviceInfo')}</h2>
          <pre className="p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto">
            {JSON.stringify(connector.info, null, 2)}
          </pre>
        </div>
      )}

      {/* Triggers */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('triggers')}</h2>
        {!connector.triggers || Object.keys(connector.triggers).length === 0 ? (
          <p className="text-muted text-sm">{t('noTriggers')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background text-left text-muted border-b border-border">
                  <th className="px-4 py-2.5 font-medium">{t('triggerName')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('triggerParams')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(connector.triggers).map(([triggerType, trigger]) => (
                  <tr key={triggerType}>
                    <td className="px-4 py-2.5 font-mono text-foreground whitespace-nowrap">{triggerType}</td>
                    <td className="px-4 py-2.5">
                      {trigger && typeof trigger === 'object' && 'params' in (trigger as Record<string, unknown>) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {((trigger as { params: string[] }).params).map((param: string) => (
                            <span
                              key={param}
                              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium"
                            >
                              {param}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-xs font-mono text-foreground/80">
                          {JSON.stringify(trigger, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tools */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('tools')}</h2>
        {!connector.tools || Object.keys(connector.tools).length === 0 ? (
          <p className="text-muted text-sm">{t('noTools')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background text-left text-muted border-b border-border">
                  <th className="px-4 py-2.5 font-medium">{t('toolName')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('toolParams')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(connector.tools).map(([toolName, tool]) => (
                  <tr key={toolName}>
                    <td className="px-4 py-2.5 font-mono text-foreground whitespace-nowrap">{toolName}</td>
                    <td className="px-4 py-2.5">
                      {tool && typeof tool === 'object' && 'params' in (tool as Record<string, unknown>) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {((tool as { params: string[] }).params).map((param: string) => (
                            <span
                              key={param}
                              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium"
                            >
                              {param}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-xs font-mono text-foreground/80">
                          {JSON.stringify(tool, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showRegenerate && (
        <RegenerateConnectorKeyModal
          connectorId={connector.appId}
          connectorName={label}
          onClose={() => setShowRegenerate(false)}
          onSuccess={handleRegenerateSuccess}
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
