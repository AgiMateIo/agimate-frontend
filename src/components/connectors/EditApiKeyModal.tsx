'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { ConnectorsApiKey } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface EditApiKeyModalProps {
  apiKey: ConnectorsApiKey;
  onClose: () => void;
  onSuccess: (apiKey: ConnectorsApiKey) => void;
}

export default function EditApiKeyModal({ apiKey, onClose, onSuccess }: EditApiKeyModalProps) {
  const [name, setName] = useState(apiKey.name);
  const [description, setDescription] = useState(apiKey.description || '');

  const { loading, error, handleSubmit } = useAsyncForm<ConnectorsApiKey>({
    onSuccess,
    defaultError: 'Failed to update API key',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateConnectorsApiKey(apiKey.pubId, {
        name,
        description: description || undefined,
      })
    );

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit API Key">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Name" required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production API Key"
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
          Note: The API key itself cannot be viewed or edited for security reasons.
          To get a new key, use the "Regenerate" button in the API keys list.
        </Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

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
