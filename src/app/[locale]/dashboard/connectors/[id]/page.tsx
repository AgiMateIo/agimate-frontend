'use client';

import { useState, Suspense, use } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import type { ConnectorDetailResponse } from '@/types';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import DisconnectConnectorModal from '@/components/connectors/DisconnectConnectorModal';
import RegenerateConnectorKeyModal from '@/components/connectors/RegenerateConnectorKeyModal';

function ConnectorContent({
  connectorPromise,
  onUpdate,
}: {
  connectorPromise: Promise<ConnectorDetailResponse>;
  onUpdate: () => void;
}) {
  const t = useTranslations('Connectors');
  const connector = use(connectorPromise);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);

  const handleDisconnectSuccess = () => {
    setShowDisconnect(false);
    onUpdate();
  };

  const handleRegenerateSuccess = () => {
    setShowRegenerate(false);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{connector.connectorName}</h1>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            connector.connected
              ? 'bg-success/10 text-success'
              : 'bg-muted/10 text-muted'
          }`}
        >
          {connector.connected ? t('connected') : t('disconnected')}
        </span>
      </div>

      {/* Connector Info */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('connectorInfo')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <dt className="text-sm text-muted">{t('connectorName')}</dt>
            <dd className="text-foreground mt-0.5">{connector.connectorName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('connectorId')}</dt>
            <dd className="text-foreground mt-0.5 font-mono text-sm">{connector.connectorId}</dd>
          </div>
          {connector.deviceId && (
            <div>
              <dt className="text-sm text-muted">{t('deviceId')}</dt>
              <dd className="text-foreground mt-0.5 font-mono text-sm">{connector.deviceId}</dd>
            </div>
          )}
        </dl>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setShowRegenerate(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-surface-secondary transition-colors"
          >
            {t('regenerateKey')}
          </button>
          {connector.connected && (
            <button
              onClick={() => setShowDisconnect(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg text-error hover:bg-error/10 transition-colors"
            >
              {t('disconnect')}
            </button>
          )}
        </div>
      </div>

      {/* Device Features */}
      {connector.deviceFeatures && Object.keys(connector.deviceFeatures).length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('deviceFeatures')}</h2>
          <pre className="p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto">
            {JSON.stringify(connector.deviceFeatures, null, 2)}
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
      {showDisconnect && (
        <DisconnectConnectorModal
          connectorId={connector.connectorId}
          connectorName={connector.connectorName}
          onClose={() => setShowDisconnect(false)}
          onSuccess={handleDisconnectSuccess}
        />
      )}

      {showRegenerate && (
        <RegenerateConnectorKeyModal
          connectorId={connector.connectorId}
          connectorName={connector.connectorName}
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
  const { promise, invalidate } = usePromiseCache(
    () => apiService.getConnectorDetail(id),
    [id],
    'connector-detail'
  );

  return (
    <div className="space-y-6">
      {/* Back link — always visible */}
      <Link
        href="/dashboard/connectors"
        className="text-sm text-primary hover:text-primary/80 transition-colors"
      >
        &larr; {t('backToConnectors')}
      </Link>

      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingConnector')}</div>}>
          <ConnectorContent connectorPromise={promise} onUpdate={invalidate} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
