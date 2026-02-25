'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { ApiKey, ApiKeyWithSecret } from '@/types';
import ApiKeysList from '@/components/api-keys/ApiKeysList';
import AddApiKeyModal from '@/components/api-keys/AddApiKeyModal';
import { useClipboard } from '@/hooks/useClipboard';
import { getApiBaseUrl } from '@/utils/api-url';

export default function ApiKeysPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useClipboard();
  const apiBaseUrl = getApiBaseUrl();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getApiKeys();
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

  const handleApiKeyAdded = (apiKey: ApiKeyWithSecret) => {
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

      {/* API Access Info */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">API Access</h2>
        <p className="text-muted text-sm">
          Pass your API key via the <code className="bg-surface-secondary px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> header with each request.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-surface-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground truncate">
            {apiBaseUrl}
          </code>
          <button
            onClick={() => copy(apiBaseUrl)}
            className="shrink-0 p-2.5 rounded-lg border border-border/50 hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
            title="Copy API URL"
          >
            {copied ? (
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-success" />
            ) : (
              <ClipboardDocumentIcon className="w-5 h-5" />
            )}
          </button>
        </div>
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

        <ApiKeysList
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
