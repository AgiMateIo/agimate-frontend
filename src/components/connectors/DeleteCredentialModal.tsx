'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { Credential } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface DeleteCredentialModalProps {
  connectorCode: string;
  credential: Credential;
  onClose: () => void;
  onSuccess: (credentialId: string) => void;
}

export default function DeleteCredentialModal({
  connectorCode,
  credential,
  onClose,
  onSuccess,
}: DeleteCredentialModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await apiService.deleteCredential(connectorCode, credential.id);
      onSuccess(credential.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete credential');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Delete Credential" size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          Are you sure you want to delete credential <strong>"{credential.name}"</strong>?
        </p>

        <Alert variant="warning">
          This action cannot be undone. Any integrations using this credential will stop working.
        </Alert>

        {error && <Alert variant="error">{error}</Alert>}

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
