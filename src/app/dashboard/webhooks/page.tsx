'use client';

import { useState, Suspense } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import apiService from '@/services/api';
import WebhooksList from '@/components/webhooks/WebhooksList';
import AddWebhookModal from '@/components/webhooks/AddWebhookModal';
import { usePromiseCache } from '@/hooks/usePromiseCache';

export default function WebhooksPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { promise: webhooksPromise, invalidate: invalidateWebhooks } = usePromiseCache(
    () => apiService.getWebhooks(),
    [],
    'webhooks'
  );

  const handleRefresh = () => {
    invalidateWebhooks();
    setRefreshKey(prev => prev + 1);
  };

  const handleWebhookAdded = () => {
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
        <span className="text-foreground font-medium">Webhooks</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
        <p className="text-muted mt-1">
          Manage webhook registrations for event notifications
        </p>
      </div>

      {/* Webhooks Section */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Webhook Registrations</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Create Webhook
          </button>
        </div>

        <Suspense key={refreshKey} fallback={<div className="text-center py-8 text-muted">Loading webhooks...</div>}>
          <WebhooksList
            webhooksPromise={webhooksPromise}
            onUpdate={handleRefresh}
          />
        </Suspense>
      </div>

      {/* Add Webhook Modal */}
      {showAddModal && (
        <AddWebhookModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleWebhookAdded}
        />
      )}
    </div>
  );
}
