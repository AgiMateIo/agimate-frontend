'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { Credential, UpdateCredentialRequest } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface EditCredentialModalProps {
  connectorCode: string;
  credential: Credential;
  onClose: () => void;
  onSuccess: (credential: Credential) => void;
}

export default function EditCredentialModal({
  connectorCode,
  credential,
  onClose,
  onSuccess,
}: EditCredentialModalProps) {
  const [name, setName] = useState(credential.name);
  const [description, setDescription] = useState(credential.description || '');

  const { loading, error, handleSubmit } = useAsyncForm<Credential>({
    onSuccess,
    defaultError: 'Failed to update credential',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateCredential(connectorCode, credential.id, {
        name,
        description: description || undefined,
      })
    );

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Credential">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Name" required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Credential"
            required
            maxLength={100}
          />
        </FormField>

        <FormField label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            maxLength={500}
            rows={2}
          />
        </FormField>

        <Alert variant="info">
          Note: Credential data (API keys, tokens, etc.) cannot be viewed or edited for security reasons.
          To update credential data, please delete this credential and create a new one.
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
            disabled={loading || !name.trim()}
            loading={loading}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
