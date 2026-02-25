'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { ApiKey } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface DeleteApiKeyModalProps {
  apiKey: ApiKey;
  onClose: () => void;
  onSuccess: (keyId: string) => void;
}

export default function DeleteApiKeyModal({ apiKey, onClose, onSuccess }: DeleteApiKeyModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await apiService.deleteApiKey(apiKey.pubId);
      onSuccess(apiKey.pubId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Delete API Key" size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          Are you sure you want to delete API key <strong>&quot;{apiKey.name}&quot;</strong>?
        </p>

        <Alert variant="warning">
          This action cannot be undone. Any applications using this API key will no longer be able to access the API.
        </Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={deleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
