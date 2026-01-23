'use client';

import { useState, Suspense } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import apiService from '@/services/api';
import MobileDevicesList from '@/components/mobile-devices/MobileDevicesList';
import AddDeviceKeyModal from '@/components/mobile-devices/AddDeviceKeyModal';
import { usePromiseCache } from '@/hooks/usePromiseCache';

export default function MobileDevicesPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Use the new usePromiseCache hook instead of module-level cache
  const { promise: devicesPromise, invalidate: invalidateDevices } = usePromiseCache(
    () => apiService.getDeviceAuthKeys(),
    [],
    'mobile-devices'
  );

  const handleRefresh = () => {
    invalidateDevices();
    setRefreshKey(prev => prev + 1);
  };

  const handleDeviceKeyAdded = () => {
    handleRefresh();
    setShowAddModal(false);
  };

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

        <Suspense key={refreshKey} fallback={<div className="text-center py-8 text-muted">Loading device keys...</div>}>
          <MobileDevicesList
            devicesPromise={devicesPromise}
            onUpdate={handleRefresh}
          />
        </Suspense>
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
