'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { DeviceAuthKeyResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface EditDeviceKeyModalProps {
  deviceKey: DeviceAuthKeyResponse;
  onClose: () => void;
  onSuccess: (deviceKey: DeviceAuthKeyResponse) => void;
}

export default function EditDeviceKeyModal({ deviceKey, onClose, onSuccess }: EditDeviceKeyModalProps) {
  const [name, setName] = useState(deviceKey.name);
  const [description, setDescription] = useState(deviceKey.description || '');

  const { loading, error, handleSubmit } = useAsyncForm<DeviceAuthKeyResponse>({
    onSuccess,
    defaultError: 'Failed to update device key',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateDeviceAuthKey(deviceKey.id, {
        name,
        description: description || undefined,
      })
    );

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Device Key">
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

        <Alert variant="info">
          Note: The device key itself cannot be viewed or edited for security reasons.
          To get a new key, you need to delete this one and create a new device key.
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
