'use client';

import { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { DeviceAuthKeyCreatedResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useClipboard } from '@/hooks/useClipboard';

interface AddDeviceKeyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDeviceKeyModal({ onClose, onSuccess }: AddDeviceKeyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createdKey, setCreatedKey] = useState<DeviceAuthKeyCreatedResponse | null>(null);
  const { copied, copy } = useClipboard();

  const { loading, error, handleSubmit } = useAsyncForm<DeviceAuthKeyCreatedResponse>({
    onSuccess: setCreatedKey,
    defaultError: 'Failed to create device key',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createDeviceAuthKey({
        name,
        description: description || undefined,
      })
    );

  const handleClose = () => {
    if (createdKey) {
      onSuccess();
    }
    onClose();
  };

  const handleCopy = () => {
    if (createdKey) {
      copy(createdKey.key);
    }
  };

  // If key was created, show the key display screen
  if (createdKey) {
    return (
      <Modal isOpen={true} onClose={handleClose} title="Device Key Created">
        <div className="space-y-4">
          <Alert variant="warning">
            <p className="font-medium">
              Save this key now! It will only be shown once.
            </p>
            <p className="text-xs mt-1">
              After closing this dialog, you will not be able to retrieve this key again.
            </p>
          </Alert>

          <FormField label="Device Key">
            <div className="flex gap-2">
              <Input
                type="text"
                value={createdKey.key}
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
              <strong>Name:</strong> {createdKey.name}
            </p>
            {createdKey.description && createdKey.description.trim() && (
              <p className="text-sm mt-1">
                <strong>Description:</strong> {createdKey.description}
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

  // Form screen
  return (
    <Modal isOpen={true} onClose={onClose} title="Create Device Key">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Name" required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Device"
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
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
