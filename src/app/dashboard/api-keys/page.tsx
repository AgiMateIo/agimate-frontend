'use client';

import { useState, Suspense } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import apiService from '@/services/api';
import { ConnectorsApiKeyWithSecret } from '@/types';
import ConnectorsApiKeysList from '@/components/connectors/ConnectorsApiKeysList';
import AddApiKeyModal from '@/components/connectors/AddApiKeyModal';
import { usePromiseCache } from '@/hooks/usePromiseCache';

export default function ApiKeysPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  // Use the new usePromiseCache hook instead of module-level cache
  const { promise: apiKeysPromise, invalidate: invalidateApiKeys } = usePromiseCache(
    () => apiService.getConnectorsApiKeys(),
    [],
    'connectors-api-keys'
  );

  const handleApiKeyAdded = (apiKey: ConnectorsApiKeyWithSecret) => {
    invalidateApiKeys();
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/api-keys" className="text-muted hover:text-foreground transition-colors">
          API Keys
        </Link>
        <ChevronRightIcon className="h-4 w-4 text-muted" />
        <span className="text-foreground font-medium">API Keys</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
        <p className="text-muted mt-1">
          Manage API keys for accessing connector or device methods via API
        </p>
      </div>

      {/* API Keys Section */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Active Keys</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Create API Key
          </button>
        </div>

        <Suspense fallback={<div className="text-center py-8 text-muted">Loading API keys...</div>}>
          <ConnectorsApiKeysList
            apiKeysPromise={apiKeysPromise}
            onUpdate={invalidateApiKeys}
          />
        </Suspense>
      </div>

      {/* Add API Key Modal */}
      {showAddModal && (
        <AddApiKeyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleApiKeyAdded}
        />
      )}
    </div>
  );
}
