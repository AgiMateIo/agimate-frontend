'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { ConnectedDevice } from '@/types';
import DisconnectDeviceModal from './DisconnectDeviceModal';

export default function ConnectedDevicesTab() {
  const t = useTranslations('Devices');
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingDevice, setDisconnectingDevice] = useState<ConnectedDevice | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getConnectedDevices();
      setDevices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDisconnectSuccess = (linkedDeviceId: string) => {
    setDevices(prev =>
      prev.map(d => d.linkedDeviceId === linkedDeviceId ? { ...d, connected: false } : d)
    );
    setDisconnectingDevice(null);
  };

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingDevices')}</div>;
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12 text-muted">{t('noDevices')}</div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {devices.map((device) => (
          <div
            key={device.deviceAuthKeyId}
            className="bg-surface rounded-xl border border-border p-4"
          >
            <div className="flex items-start justify-between gap-4">
              {device.linkedDeviceId ? (
                <Link
                  href={`/dashboard/devices/${device.linkedDeviceId}`}
                  className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">
                      {device.deviceName || t('noDeviceConnected')}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        device.connected
                          ? 'bg-success/10 text-success'
                          : 'bg-muted/10 text-muted'
                      }`}
                    >
                      {device.connected ? t('connected') : t('disconnected')}
                    </span>
                  </div>
                  <div className="text-sm text-muted mt-1 space-y-0.5">
                    <p>{device.deviceAuthKeyName}{device.deviceOs ? ` (${device.deviceOs})` : ''}</p>
                    <p className="text-xs font-mono">{device.linkedDeviceId}</p>
                  </div>
                </Link>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">
                      {t('noDeviceConnected')}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted/10 text-muted">
                      {t('disconnected')}
                    </span>
                  </div>
                  <div className="text-sm text-muted mt-1">
                    <p>{device.deviceAuthKeyName}</p>
                  </div>
                </div>
              )}

              {device.connected && (
                <button
                  onClick={() => setDisconnectingDevice(device)}
                  className="text-sm text-error hover:text-error/80 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-error/10"
                >
                  {t('disconnect')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {disconnectingDevice && (
        <DisconnectDeviceModal
          device={disconnectingDevice}
          onClose={() => setDisconnectingDevice(null)}
          onSuccess={handleDisconnectSuccess}
        />
      )}
    </>
  );
}
