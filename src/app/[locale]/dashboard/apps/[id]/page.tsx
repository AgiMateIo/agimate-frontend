'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import type { AppDetailResponse } from '@/types';
import DisconnectAppModal from '@/components/apps/DisconnectAppModal';
import RegenerateAppKeyModal from '@/components/apps/RegenerateAppKeyModal';

export default function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Apps');
  const [app, setApp] = useState<AppDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);

  const fetchApp = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getAppDetail(id);
      setApp(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  const handleDisconnectSuccess = () => {
    setShowDisconnect(false);
    fetchApp();
  };

  const handleRegenerateSuccess = () => {
    setShowRegenerate(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingApp')}</div>;
  }

  if (error || !app) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/apps"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          &larr; {t('backToApps')}
        </Link>
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">{error || t('appNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/apps"
        className="text-sm text-primary hover:text-primary/80 transition-colors"
      >
        &larr; {t('backToApps')}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{app.appName}</h1>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            app.connected
              ? 'bg-success/10 text-success'
              : 'bg-muted/10 text-muted'
          }`}
        >
          {app.connected ? t('connected') : t('disconnected')}
        </span>
      </div>

      {/* App Info */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('appInfo')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <dt className="text-sm text-muted">{t('appName')}</dt>
            <dd className="text-foreground mt-0.5">{app.appName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('appId')}</dt>
            <dd className="text-foreground mt-0.5 font-mono text-sm">{app.appId}</dd>
          </div>
          {app.deviceId && (
            <div>
              <dt className="text-sm text-muted">{t('deviceId')}</dt>
              <dd className="text-foreground mt-0.5 font-mono text-sm">{app.deviceId}</dd>
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
          {app.connected && (
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
      {app.deviceFeatures && Object.keys(app.deviceFeatures).length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('deviceFeatures')}</h2>
          <pre className="p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto">
            {JSON.stringify(app.deviceFeatures, null, 2)}
          </pre>
        </div>
      )}

      {/* Triggers */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('triggers')}</h2>
        {!app.triggers || Object.keys(app.triggers).length === 0 ? (
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
                {Object.entries(app.triggers).map(([triggerType, trigger]) => (
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
        {!app.tools || Object.keys(app.tools).length === 0 ? (
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
                {Object.entries(app.tools).map(([toolName, tool]) => (
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
        <DisconnectAppModal
          appId={app.appId}
          appName={app.appName}
          onClose={() => setShowDisconnect(false)}
          onSuccess={handleDisconnectSuccess}
        />
      )}

      {showRegenerate && (
        <RegenerateAppKeyModal
          appId={app.appId}
          appName={app.appName}
          onClose={() => setShowRegenerate(false)}
          onSuccess={handleRegenerateSuccess}
        />
      )}
    </div>
  );
}
