'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { Webhook } from '@/types';
import WebhooksList from '@/components/webhooks/WebhooksList';
import AddWebhookModal from '@/components/webhooks/AddWebhookModal';

export default function WebhooksPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getWebhooks();
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWebhookAdded = () => {
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
          <span className="text-foreground font-medium">Webhooks</span>
        </nav>
        <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
        <div className="text-center py-12 text-muted">Loading webhooks...</div>
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
          <span className="text-foreground font-medium">Webhooks</span>
        </nav>
        <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
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

        <WebhooksList
          webhooks={webhooks}
          onUpdate={fetchData}
        />
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
