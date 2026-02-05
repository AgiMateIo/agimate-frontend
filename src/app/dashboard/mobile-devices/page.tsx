'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import apiService from '@/services/api';
import { DeviceAuthKeyResponse } from '@/types';
import MobileDevicesList from '@/components/mobile-devices/MobileDevicesList';
import AddDeviceKeyModal from '@/components/mobile-devices/AddDeviceKeyModal';

export default function MobileDevicesPage() {
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
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRightIcon className="h-4 w-4 text-muted" />
          <span className="text-foreground font-medium">Mobile Devices</span>
        </nav>
        <h1 className="text-2xl font-bold text-foreground">Mobile Devices</h1>
        <div className="text-center py-12 text-muted">Loading device keys...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRightIcon className="h-4 w-4 text-muted" />
          <span className="text-foreground font-medium">Mobile Devices</span>
        </nav>
        <h1 className="text-2xl font-bold text-foreground">Mobile Devices</h1>
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRightIcon className="h-4 w-4 text-muted" />
        <span className="text-foreground font-medium">Mobile Devices</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mobile Devices</h1>
        <p className="text-muted mt-1">
          Manage device authentication keys for mobile app access
        </p>
      </div>

      {/* Device Keys Section */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Device Keys</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Create Device Key
          </button>
        </div>

        <MobileDevicesList
          devices={devices}
          onUpdate={fetchData}
        />
      </div>

      {/* Add Device Key Modal */}
      {showAddModal && (
        <AddDeviceKeyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleDeviceKeyAdded}
        />
      )}
    </div>
  );
}
