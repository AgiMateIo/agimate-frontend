'use client';

import { useState } from 'react';
import apiService from '@/services/api';
import { Webhook } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import EventTypePicker from './EventTypePicker';

interface AddWebhookModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const URL_PATTERN = /^https?:\/\/.+/;

export default function AddWebhookModal({ onClose, onSuccess }: AddWebhookModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [eventTypesError, setEventTypesError] = useState('');
  const [urlError, setUrlError] = useState('');

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<Webhook>({
    onSuccess: () => {
      onSuccess();
    },
    defaultError: 'Failed to create webhook',
  });

  const getFieldError = (prefix: string) =>
    Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .join('; ')
    || '';

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      setUrlError('');
      return true;
    }
    if (!URL_PATTERN.test(value)) {
      setUrlError('URL must start with http:// or https://');
      return false;
    }
    setUrlError('');
    return true;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate before submit
    const isUrlValid = validateUrl(url);

    if (eventTypes.length === 0) {
      setEventTypesError('At least one event type is required');
      return;
    } else {
      setEventTypesError('');
    }

    if (!isUrlValid) {
      return;
    }

    return handleSubmit(e, () =>
      apiService.createWebhook({
        name,
        description: description || undefined,
        eventTypes,
        url,
        authHeader: authHeader || undefined,
        enabled,
      })
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Webhook">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Name" required error={getFieldError('name')}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production n8n webhook"
            required
            maxLength={100}
          />
        </FormField>

        <FormField label="Description" error={getFieldError('description')}>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            maxLength={500}
            rows={2}
          />
        </FormField>

        <FormField label="Event Types" required error={eventTypesError || getFieldError('eventTypes')}>
          <EventTypePicker
            selectedEventTypes={eventTypes}
            onChange={setEventTypes}
            error={eventTypesError || getFieldError('eventTypes')}
          />
        </FormField>

        <FormField label="URL" required error={urlError || getFieldError('url')}>
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={(e) => validateUrl(e.target.value)}
            placeholder="https://n8n.example.com/webhook/abc-123"
            required
            maxLength={2000}
          />
        </FormField>

        {url.startsWith('http://') && (
          <Alert variant="warning">
            Warning: Using insecure HTTP connection. HTTPS is recommended.
          </Alert>
        )}

        <FormField label="Authentication Header">
          <Input
            type="password"
            value={authHeader}
            onChange={(e) => setAuthHeader(e.target.value)}
            placeholder="Bearer your-token-here"
            maxLength={1000}
          />
        </FormField>

        {authHeader && (
          <Alert variant="warning">
            <p className="font-medium">
              Authentication header will only be stored securely and cannot be retrieved later.
            </p>
            <p className="text-xs mt-1">
              Make sure to save a copy if you need it for future reference.
            </p>
          </Alert>
        )}

        <FormField label="Enabled">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-foreground">Enable webhook immediately</span>
          </div>
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
            disabled={loading || !name.trim() || eventTypes.length === 0 || !url.trim()}
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
