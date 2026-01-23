'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/services/api';
import { Webhook } from '@/types';
import { TrashIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import DeleteWebhookModal from './DeleteWebhookModal';
import { Toggle } from '@/components/ui/Toggle';

interface WebhooksListProps {
  webhooksPromise: Promise<Webhook[]>;
  onUpdate?: () => void;
}

export default function WebhooksList({ webhooksPromise, onUpdate }: WebhooksListProps) {
  const router = useRouter();
  const initialWebhooks = use(webhooksPromise);
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [deletingWebhook, setDeletingWebhook] = useState<Webhook | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Sync state when promise result changes (after invalidation)
  useEffect(() => {
    setWebhooks(initialWebhooks);
  }, [initialWebhooks]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString.replace(' ', 'T'));
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatLastTriggered = (dateString: string | null) => {
    if (!dateString) return 'Never triggered';
    return formatDate(dateString);
  };

  const truncateUrl = (url: string, maxLength = 50) => {
    return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
  };

  const handleToggleEnabled = async (webhook: Webhook) => {
    setUpdatingIds(prev => new Set(prev).add(webhook.id));

    // Optimistic update
    setWebhooks(prev =>
      prev.map(w => w.id === webhook.id ? { ...w, enabled: !w.enabled } : w)
    );

    try {
      await apiService.updateWebhook(webhook.id, {
        enabled: !webhook.enabled,
      });
      // Cache will be cleared on unmount
    } catch (error) {
      console.error('Failed to update webhook:', error);
      // Revert on error
      setWebhooks(prev =>
        prev.map(w => w.id === webhook.id ? { ...w, enabled: webhook.enabled } : w)
      );
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(webhook.id);
        return next;
      });
    }
  };

  const handleDeleteSuccess = (webhookId: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== webhookId));
    setDeletingWebhook(null);
    onUpdate?.();
  };

  if (webhooks.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        No webhooks created yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {webhooks.map((webhook) => (
          <div
            key={webhook.id}
            className="bg-surface-secondary rounded-lg p-4 border border-border"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{webhook.name}</h3>
                {webhook.description && (
                  <p className="text-sm text-muted mt-1">{webhook.description}</p>
                )}
                <div className="text-xs text-muted mt-2 space-y-1">
                  <div>
                    <span className="text-muted">Events: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {webhook.eventTypes.map((eventType) => (
                        <span
                          key={eventType}
                          className="inline-block bg-surface border border-border rounded px-2 py-0.5 font-mono text-foreground"
                        >
                          {eventType}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="truncate">URL: <span className="font-mono">{truncateUrl(webhook.url)}</span></p>
                    {webhook.hasAuth && (
                      <span className="flex items-center gap-1 text-success">
                        <LockClosedIcon className="h-3 w-3" />
                        Auth
                      </span>
                    )}
                  </div>
                  <p>Last triggered: {formatLastTriggered(webhook.lastTriggeredAt)}</p>
                  <p>Created: {formatDate(webhook.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Switch */}
                <Toggle
                  checked={webhook.enabled}
                  onChange={() => handleToggleEnabled(webhook)}
                  disabled={updatingIds.has(webhook.id)}
                />

                {/* View Details Button */}
                <button
                  onClick={() => router.push(`/dashboard/webhooks/${webhook.id}`)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-secondary text-foreground hover:bg-surface transition-colors text-sm"
                  title="View details"
                >
                  Details
                  <ArrowRightIcon className="h-4 w-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setDeletingWebhook(webhook)}
                  className="p-2 text-muted hover:text-error transition-colors rounded-lg"
                  title="Delete webhook"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Modal */}
      {deletingWebhook && (
        <DeleteWebhookModal
          webhook={deletingWebhook}
          onClose={() => setDeletingWebhook(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
