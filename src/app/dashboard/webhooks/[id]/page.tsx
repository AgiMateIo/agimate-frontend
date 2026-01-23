'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { Webhook } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import WebhookEditForm from '@/components/webhooks/WebhookEditForm';
import WebhookHistory from '@/components/webhooks/WebhookHistory';
import DeleteWebhookModal from '@/components/webhooks/DeleteWebhookModal';

export default function WebhookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const webhookId = params.id as string;

  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load webhook info
  useEffect(() => {
    const fetchWebhook = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiService.getWebhook(webhookId);
        setWebhook(data);
      } catch (err) {
        console.error('Failed to load webhook:', err);
        setError(err instanceof Error ? err.message : 'Failed to load webhook');
      } finally {
        setLoading(false);
      }
    };

    fetchWebhook();
  }, [webhookId]);

  const handleWebhookUpdated = (updated: Webhook) => {
    setWebhook(updated);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteSuccess = () => {
    router.push('/dashboard/webhooks');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted">Loading webhook...</div>
      </div>
    );
  }

  if (error || !webhook) {
    return (
      <div className="space-y-6">
        <Alert variant="error">{error || 'Webhook not found'}</Alert>
        <button
          onClick={() => router.push('/dashboard/webhooks')}
          className="text-accent hover:underline"
        >
          Back to Webhooks
        </button>
      </div>
    );
  }

  const tabs = [
    {
      id: 'info',
      label: 'Info',
      content: (
        <div className="bg-surface rounded-xl border border-border p-6">
          <WebhookEditForm webhook={webhook} onSuccess={handleWebhookUpdated} onDelete={handleDeleteClick} />
        </div>
      ),
    },
    {
      id: 'history',
      label: 'History',
      content: (
        <div className="bg-surface rounded-xl border border-border p-6">
          <WebhookHistory webhookId={webhookId} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRightIcon className="h-4 w-4 text-muted" />
        <Link href="/dashboard/webhooks" className="text-muted hover:text-foreground transition-colors">
          Webhooks
        </Link>
        <ChevronRightIcon className="h-4 w-4 text-muted" />
        <span className="text-foreground font-medium">{webhook.name}</span>
      </nav>

      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/webhooks')}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">Back to Webhooks</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{webhook.name}</h1>
        {webhook.description && <p className="text-muted mt-1">{webhook.description}</p>}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteWebhookModal
          webhook={webhook}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
