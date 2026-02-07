'use client';

import { useLocale } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { use, useState, useEffect } from 'react';
import apiService from '@/services/api';
import { Credential } from '@/types';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import DeleteCredentialModal from './DeleteCredentialModal';
import EditCredentialModal from './EditCredentialModal';
import { Toggle } from '@/components/ui/Toggle';

interface CredentialsListProps {
  connectorCode: string;
  credentialsPromise: Promise<Credential[]>;
  onUpdate?: () => void;
}

export default function CredentialsList({ connectorCode, credentialsPromise, onUpdate }: CredentialsListProps) {
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const initialCredentials = use(credentialsPromise);
  const [credentials, setCredentials] = useState<Credential[]>(initialCredentials);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);

  // Sync state when promise result changes (after invalidation)
  useEffect(() => {
    setCredentials(initialCredentials);
  }, [initialCredentials]);
  const [deletingCredential, setDeletingCredential] = useState<Credential | null>(null);
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

  const handleToggleEnabled = async (credential: Credential) => {
    setUpdatingIds(prev => new Set(prev).add(credential.id));

    // Optimistic update
    setCredentials(prev =>
      prev.map(c => c.id === credential.id ? { ...c, enabled: !c.enabled } : c)
    );

    try {
      await apiService.updateCredential(connectorCode, credential.id, {
        enabled: !credential.enabled,
      });
      // Cache will be cleared on unmount
    } catch (error) {
      console.error('Failed to update credential:', error);
      // Revert on error
      setCredentials(prev =>
        prev.map(c => c.id === credential.id ? { ...c, enabled: credential.enabled } : c)
      );
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(credential.id);
        return next;
      });
    }
  };

  const handleDeleteSuccess = (credentialId: string) => {
    setCredentials(prev => prev.filter(c => c.id !== credentialId));
    setDeletingCredential(null);
    onUpdate?.();
  };

  const handleEditSuccess = (updated: Credential) => {
    setCredentials(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditingCredential(null);
    // Cache will be cleared on unmount
  };

  if (credentials.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        No credentials configured yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {credentials.map((credential) => (
          <div
            key={credential.id}
            className="bg-surface-secondary rounded-lg p-4 border border-border"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{credential.name}</h3>
                {credential.description && (
                  <p className="text-sm text-muted mt-1">{credential.description}</p>
                )}
                <div className="text-xs text-muted mt-2 space-y-1">
                  <p>Created: {formatDate(credential.createdAt)}</p>
                  {credential.lastUsedAt && (
                    <p>Last used: {formatDate(credential.lastUsedAt)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Switch */}
                <Toggle
                  checked={credential.enabled}
                  onChange={() => handleToggleEnabled(credential)}
                  disabled={updatingIds.has(credential.id)}
                />

                {/* Edit Button */}
                <button
                  onClick={() => setEditingCredential(credential)}
                  className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setDeletingCredential(credential)}
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
      {editingCredential && (
        <EditCredentialModal
          connectorCode={connectorCode}
          credential={editingCredential}
          onClose={() => setEditingCredential(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingCredential && (
        <DeleteCredentialModal
          connectorCode={connectorCode}
          credential={deletingCredential}
          onClose={() => setDeletingCredential(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
