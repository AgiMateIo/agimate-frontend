'use client';

import { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { ConnectorsApiKey, ConnectorsApiKeyWithSecret } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useClipboard } from '@/hooks/useClipboard';

interface RegenerateApiKeyModalProps {
  apiKey: ConnectorsApiKey;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegenerateApiKeyModal({ apiKey, onClose, onSuccess }: RegenerateApiKeyModalProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regeneratedKey, setRegeneratedKey] = useState<ConnectorsApiKeyWithSecret | null>(null);
  const { copied, copy } = useClipboard();

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);

    try {
      const result = await apiService.regenerateConnectorsApiKey(apiKey.pubId);
      setRegeneratedKey(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  };

  const handleClose = () => {
    if (regeneratedKey) {
      onSuccess();
    }
    onClose();
  };

  const handleCopy = () => {
    if (regeneratedKey) {
      copy(regeneratedKey.fullKey);
    }
  };

  // If key was regenerated, show the new key
  if (regeneratedKey) {
    return (
      <Modal isOpen={true} onClose={handleClose} title="New API Key Generated">
        <div className="space-y-4">
          <Alert variant="warning">
            <p className="font-medium">
              Save this key now! It will only be shown once.
            </p>
            <p className="text-xs mt-1">
              The previous API key has been invalidated and will no longer work.
            </p>
          </Alert>

          <FormField label="New API Key">
            <div className="flex gap-2">
              <Input
                type="text"
                value={regeneratedKey.fullKey}
                readOnly
                className="flex-1 font-mono text-sm select-all"
              />
              <Button onClick={handleCopy} className="flex items-center gap-2 whitespace-nowrap">
                {copied ? (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-5 w-5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </FormField>

          <Alert variant="info">
            <p className="text-sm">
              <strong>Name:</strong> {regeneratedKey.apiKey.name}
            </p>
            {regeneratedKey.apiKey.description && regeneratedKey.apiKey.description.trim() && (
              <p className="text-sm mt-1">
                <strong>Description:</strong> {regeneratedKey.apiKey.description}
              </p>
            )}
          </Alert>

          <Button onClick={handleClose} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  // Confirmation screen
  return (
    <Modal isOpen={true} onClose={onClose} title="Regenerate API Key" size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          Are you sure you want to regenerate the API key for <strong>"{apiKey.name}"</strong>?
        </p>

        <Alert variant="warning">
          The current API key will immediately stop working. Any applications using the old key will need to be updated with the new key.
        </Alert>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={regenerating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleRegenerate}
            loading={regenerating}
            className="flex-1"
          >
            Regenerate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
