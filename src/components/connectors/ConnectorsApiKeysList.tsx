'use client';

import { useLocale } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import apiService from '@/services/api';
import { ConnectorsApiKey } from '@/types';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import DeleteApiKeyModal from './DeleteApiKeyModal';
import EditApiKeyModal from './EditApiKeyModal';
import { Toggle } from '@/components/ui/Toggle';

interface ConnectorsApiKeysListProps {
  apiKeys: ConnectorsApiKey[];
  onUpdate?: () => void;
}

export default function ConnectorsApiKeysList({ apiKeys: apiKeysProp, onUpdate }: ConnectorsApiKeysListProps) {
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const [apiKeys, setApiKeys] = useState<ConnectorsApiKey[]>(apiKeysProp);
  const [editingApiKey, setEditingApiKey] = useState<ConnectorsApiKey | null>(null);

  // Sync state when prop changes (after parent refetch)
  useEffect(() => {
    setApiKeys(apiKeysProp);
  }, [apiKeysProp]);
  const [deletingApiKey, setDeletingApiKey] = useState<ConnectorsApiKey | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString.replace(' ', 'T'));
    return new Intl.DateTimeFormat(bcp47Locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleToggleEnabled = async (apiKey: ConnectorsApiKey) => {
    setUpdatingIds(prev => new Set(prev).add(apiKey.pubId));

    // Optimistic update
    setApiKeys(prev =>
      prev.map(k => k.pubId === apiKey.pubId ? { ...k, enabled: !k.enabled } : k)
    );

    try {
      await apiService.updateConnectorsApiKey(apiKey.pubId, {
        enabled: !apiKey.enabled,
      });
      // Cache will be cleared on unmount
    } catch (error) {
      console.error('Failed to update API key:', error);
      // Revert on error
      setApiKeys(prev =>
        prev.map(k => k.pubId === apiKey.pubId ? { ...k, enabled: apiKey.enabled } : k)
      );
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(apiKey.pubId);
        return next;
      });
    }
  };

  const handleDeleteSuccess = (keyId: string) => {
    setApiKeys(prev => prev.filter(k => k.pubId !== keyId));
    setDeletingApiKey(null);
    onUpdate?.();
  };

  const handleEditSuccess = (updated: ConnectorsApiKey) => {
    setApiKeys(prev => prev.map(k => k.pubId === updated.pubId ? updated : k));
    setEditingApiKey(null);
    // Cache will be cleared on unmount
  };

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        No API keys created yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {apiKeys.map((apiKey) => (
          <div
            key={apiKey.pubId}
            className="bg-surface-secondary rounded-lg p-4 border border-border"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{apiKey.name}</h3>
                {apiKey.description && (
                  <p className="text-sm text-muted mt-1">{apiKey.description}</p>
                )}
                <div className="text-xs text-muted mt-2 space-y-1">
                  <p>Key: <span className="font-mono">{apiKey.maskedKeyId}</span></p>
                  <p>Created: {formatDate(apiKey.createdAt)}</p>
                  <p>Updated: {formatDate(apiKey.updatedAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Switch */}
                <Toggle
                  checked={apiKey.enabled}
                  onChange={() => handleToggleEnabled(apiKey)}
                  disabled={updatingIds.has(apiKey.pubId)}
                />

                {/* Edit Button */}
                <button
                  onClick={() => setEditingApiKey(apiKey)}
                  className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setDeletingApiKey(apiKey)}
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
      {editingApiKey && (
        <EditApiKeyModal
          apiKey={editingApiKey}
          onClose={() => setEditingApiKey(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingApiKey && (
        <DeleteApiKeyModal
          apiKey={deletingApiKey}
          onClose={() => setDeletingApiKey(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}

    </>
  );
}
