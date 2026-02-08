'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { DeviceAuthKeyResponse } from '@/types';
import DeviceKeysList from './DeviceKeysList';
import AddDeviceKeyModal from './AddDeviceKeyModal';

export default function DeviceKeysTab() {
  const t = useTranslations('Devices');
  const [showAddModal, setShowAddModal] = useState(false);
  const [devices, setDevices] = useState<DeviceAuthKeyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getDeviceAuthKeys();
      setDevices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeviceKeyAdded = () => {
    fetchData();
    setShowAddModal(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingDeviceKeys')}</div>;
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('deviceKeys')}</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            {t('createDeviceKey')}
          </button>
        </div>

        <DeviceKeysList
          devices={devices}
          onUpdate={fetchData}
        />
      </div>

      {showAddModal && (
        <AddDeviceKeyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleDeviceKeyAdded}
        />
      )}
    </>
  );
}
