'use client';

import { useState, useEffect } from 'react';
import apiService from '@/services/api';
import { Webhook, UpdateWebhookRequest } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import EventTypePicker from './EventTypePicker';
import { Toggle } from '@/components/ui/Toggle';

interface WebhookEditFormProps {
  webhook: Webhook;
  onSuccess: (updated: Webhook) => void;
  onDelete: () => void;
}

const URL_PATTERN = /^https?:\/\/.+/;

export default function WebhookEditForm({ webhook, onSuccess, onDelete }: WebhookEditFormProps) {
  const [name, setName] = useState(webhook.name);
  const [description, setDescription] = useState(webhook.description);
  const [eventTypes, setEventTypes] = useState<string[]>(webhook.eventTypes);
  const [url, setUrl] = useState(webhook.url);
  const [authHeader, setAuthHeader] = useState('');
  const [enabled, setEnabled] = useState(webhook.enabled);
  const [eventTypesError, setEventTypesError] = useState('');
  const [urlError, setUrlError] = useState('');

  // Reset form when webhook changes (after save)
  useEffect(() => {
    setName(webhook.name);
    setDescription(webhook.description);
    setEventTypes(webhook.eventTypes);
    setUrl(webhook.url);
    setEnabled(webhook.enabled);
    setAuthHeader('');
    setEventTypesError('');
    setUrlError('');
  }, [webhook]);

  const { loading, error, fieldErrors, handleSubmit, setError } = useAsyncForm<Webhook>({
    onSuccess: (updated) => {
      onSuccess(updated);
    },
    defaultError: 'Failed to update webhook',
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

  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
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

    return handleSubmit(e, async () => {
      const updates: UpdateWebhookRequest = {
        name,
        description,
        eventTypes,
        url,
        enabled,
      };

      // Only include authHeader if it was changed
      if (authHeader) {
        updates.authHeader = authHeader;
      }

      return await apiService.updateWebhook(webhook.id, updates);
    });
  };

  return (
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
          <div className="space-y-2">
            {webhook.hasAuth && (
              <div className="flex items-center gap-2 text-sm text-success">
                <LockClosedIcon className="h-4 w-4" />
                <span>Authentication configured</span>
              </div>
            )}
            <Input
              type="password"
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
              placeholder="Enter new value to replace existing authentication"
              maxLength={1000}
            />
            <p className="text-xs text-muted">
              Leave empty to keep existing authentication. Enter new value to replace.
            </p>
          </div>
        </FormField>

        <FormField label="Status">
          <Toggle checked={enabled} onChange={setEnabled} label="Webhook is enabled" />
        </FormField>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button
          type="submit"
          disabled={loading || !name.trim() || eventTypes.length === 0 || !url.trim()}
          loading={loading}
          className="flex-1"
        >
          Save
        </Button>
        <Button type="button" variant="danger" onClick={onDelete} disabled={loading}>
          Delete
        </Button>
      </div>
    </form>
  );
}
