'use client';

import apiService from '@/services/api';
import { Webhook } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteWebhookModalProps {
  webhook: Webhook;
  onClose: () => void;
  onSuccess: (webhookId: string) => void;
}

export default function DeleteWebhookModal({ webhook, onClose, onSuccess }: DeleteWebhookModalProps) {
  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess: () => {
      onSuccess(webhook.id);
    },
    defaultError: 'Failed to delete webhook',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.deleteWebhook(webhook.id);
    });

  return (
    <Modal isOpen={true} onClose={onClose} title="Delete Webhook">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">
          Are you sure you want to delete webhook <strong>{webhook.name}</strong>?
        </p>

        <Alert variant="warning">
          This action cannot be undone. The webhook will stop receiving events immediately.
        </Alert>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={loading}
            loading={loading}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </form>
    </Modal>
  );
}
