'use client';

import { use, useState, useEffect } from 'react';
import apiService from '@/services/api';
import { DeviceAuthKeyResponse } from '@/types';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import DeleteDeviceKeyModal from './DeleteDeviceKeyModal';
import EditDeviceKeyModal from './EditDeviceKeyModal';
import { Toggle } from '@/components/ui/Toggle';

interface MobileDevicesListProps {
  devicesPromise: Promise<DeviceAuthKeyResponse[]>;
  onUpdate?: () => void;
}

export default function MobileDevicesList({ devicesPromise, onUpdate }: MobileDevicesListProps) {
  const initialDevices = use(devicesPromise);
  const [devices, setDevices] = useState<DeviceAuthKeyResponse[]>(initialDevices);
  const [editingDevice, setEditingDevice] = useState<DeviceAuthKeyResponse | null>(null);

  // Sync state when promise result changes (after invalidation)
  useEffect(() => {
    setDevices(initialDevices);
  }, [initialDevices]);
  const [deletingDevice, setDeletingDevice] = useState<DeviceAuthKeyResponse | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString.replace(' ', 'T'));
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleToggleEnabled = async (device: DeviceAuthKeyResponse) => {
    setUpdatingIds(prev => new Set(prev).add(device.id));

    // Optimistic update
    setDevices(prev =>
      prev.map(d => d.id === device.id ? { ...d, enabled: !d.enabled } : d)
    );

    try {
      await apiService.updateDeviceAuthKey(device.id, {
        enabled: !device.enabled,
      });
      // Cache will be cleared on unmount
    } catch (error) {
      console.error('Failed to update device key:', error);
      // Revert on error
      setDevices(prev =>
        prev.map(d => d.id === device.id ? { ...d, enabled: device.enabled } : d)
      );
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  const handleDeleteSuccess = (keyId: string) => {
    setDevices(prev => prev.filter(d => d.id !== keyId));
    setDeletingDevice(null);
    onUpdate?.();
  };

  const handleEditSuccess = (updated: DeviceAuthKeyResponse) => {
    setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
    setEditingDevice(null);
    // Cache will be cleared on unmount
  };

  if (devices.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        No device keys created yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {devices.map((device) => (
          <div
            key={device.id}
            className="bg-surface-secondary rounded-lg p-4 border border-border"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{device.name}</h3>
                {device.description && (
                  <p className="text-sm text-muted mt-1">{device.description}</p>
                )}
                <div className="text-xs text-muted mt-2 space-y-1">
                  <p>Key: <span className="font-mono">{device.maskedKeyId}</span></p>
                  <p>Created: {formatDate(device.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Switch */}
                <Toggle
                  checked={device.enabled}
                  onChange={() => handleToggleEnabled(device)}
                  disabled={updatingIds.has(device.id)}
                />

                {/* Edit Button */}
                <button
                  onClick={() => setEditingDevice(device)}
                  className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setDeletingDevice(device)}
                  className="p-2 text-muted hover:text-error transition-colors rounded-lg"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {editingDevice && (
        <EditDeviceKeyModal
          deviceKey={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingDevice && (
        <DeleteDeviceKeyModal
          deviceKey={deletingDevice}
          onClose={() => setDeletingDevice(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
