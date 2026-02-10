'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import type { DeviceDetail } from '@/types';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Devices');
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevice = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getDeviceDetail(id);
      setDevice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingDevice')}</div>;
  }

  if (error || !device) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/devices"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          &larr; {t('backToDevices')}
        </Link>
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">{error || t('deviceNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/devices"
        className="text-sm text-primary hover:text-primary/80 transition-colors"
      >
        &larr; {t('backToDevices')}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{device.deviceAuthKeyName}</h1>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            device.connected
              ? 'bg-success/10 text-success'
              : 'bg-muted/10 text-muted'
          }`}
        >
          {device.connected ? t('connected') : t('disconnected')}
        </span>
      </div>

      {/* Device Info */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('deviceInfo')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <dt className="text-sm text-muted">{t('connectionName')}</dt>
            <dd className="text-foreground mt-0.5">{device.deviceAuthKeyName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('linkedDeviceId')}</dt>
            <dd className="text-foreground mt-0.5 font-mono text-sm">{device.deviceId}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('deviceName')}</dt>
            <dd className="text-foreground mt-0.5">{device.deviceName || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('deviceOs')}</dt>
            <dd className="text-foreground mt-0.5">{device.deviceOs || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Triggers */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('triggers')}</h2>
        {!device.triggers || Object.keys(device.triggers).length === 0 ? (
          <p className="text-muted text-sm">{t('noTriggers')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background text-left text-muted border-b border-border">
                  <th className="px-4 py-2.5 font-medium">{t('paramName')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('triggerParams')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(device.triggers).map(([triggerType, trigger]) => (
                  <tr key={triggerType}>
                    <td className="px-4 py-2.5 font-mono text-foreground whitespace-nowrap">{triggerType}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {trigger.params.map((param) => (
                          <span
                            key={param}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium"
                          >
                            {param}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('actions')}</h2>
        {!device.actions || Object.keys(device.actions).length === 0 ? (
          <p className="text-muted text-sm">{t('noActions')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background text-left text-muted border-b border-border">
                  <th className="px-4 py-2.5 font-medium">{t('paramName')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('actionParams')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(device.actions).map(([actionType, action]) => (
                  <tr key={actionType}>
                    <td className="px-4 py-2.5 font-mono text-foreground whitespace-nowrap">{actionType}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {action.params.map((param) => (
                          <span
                            key={param}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium"
                          >
                            {param}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
