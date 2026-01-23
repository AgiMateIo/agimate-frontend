'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import apiService from '@/services/api';
import { ConnectorInfo, Credential } from '@/types';
import CredentialsList from '@/components/connectors/CredentialsList';
import AddCredentialModal from '@/components/connectors/AddCredentialModal';
import { usePromiseCache } from '@/hooks/usePromiseCache';

export default function ConnectorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const connectorCode = params.code as string;

  const [connector, setConnector] = useState<ConnectorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Use the new usePromiseCache hook instead of module-level cache
  const { promise: credentialsPromise, invalidate: invalidateCredentials } = usePromiseCache(
    () => apiService.getCredentials(connectorCode),
    [connectorCode],
    'connector-credentials'
  );

  useEffect(() => {
    const fetchConnector = async () => {
      try {
        const connectors = await apiService.getConnectors();
        const found = connectors.find(c => c.code === connectorCode);
        if (!found) {
          setError('Connector not found');
        } else {
          setConnector(found);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load connector');
      } finally {
        setLoading(false);
      }
    };

    fetchConnector();
  }, [connectorCode]);

  const handleCredentialAdded = (credential: Credential) => {
    invalidateCredentials();
    setShowAddModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted">Loading...</div>
      </div>
    );
  }

  if (error || !connector) {
    return (
      <div className="space-y-6">
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">{error || 'Connector not found'}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/connectors')}
          className="text-accent hover:underline"
        >
          ← Back to Connectors
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/connectors"
          className="text-muted hover:text-foreground transition-colors"
        >
          Connectors
        </Link>
        <ChevronRightIcon className="h-4 w-4 text-muted" />
        <span className="text-foreground font-medium">{connector.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-surface-secondary flex items-center justify-center border border-border">
          {connector.iconUrl ? (
            <img
              src={connector.iconUrl}
              alt={connector.name}
              className="w-12 h-12 object-contain"
            />
          ) : (
            <span className="text-3xl font-bold text-muted">{connector.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground mb-2">{connector.name}</h1>
          <p className="text-muted">{connector.description}</p>
          {connector.hasMethodDefinitions && (
            <p className="text-xs text-success mt-2">API methods available</p>
          )}
        </div>
      </div>

      {/* Credentials Section */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Credentials</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Add Credential
          </button>
        </div>

        <Suspense fallback={<div className="text-center py-8 text-muted">Loading credentials...</div>}>
          <CredentialsList
            connectorCode={connectorCode}
            credentialsPromise={credentialsPromise}
            onUpdate={invalidateCredentials}
          />
        </Suspense>
      </div>

      {/* Add Credential Modal */}
      {showAddModal && (
        <AddCredentialModal
          connector={connector}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCredentialAdded}
        />
      )}
    </div>
  );
}
