'use client';

import { useState, useEffect, useCallback } from 'react';
import apiService from '@/services/api';
import { ConnectorsApiKey, ConnectorsApiKeyWithSecret } from '@/types';
import ConnectorsApiKeysList from '@/components/connectors/ConnectorsApiKeysList';
import AddApiKeyModal from '@/components/connectors/AddApiKeyModal';

export default function ApiKeysPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<ConnectorsApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getConnectorsApiKeys();
      setApiKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApiKeyAdded = (apiKey: ConnectorsApiKeyWithSecret) => {
    fetchData();
    setShowAddModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
        <div className="text-center py-12 text-muted">Loading API keys...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

        <ConnectorsApiKeysList
          apiKeys={apiKeys}
          onUpdate={fetchData}
        />
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
