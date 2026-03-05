'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { AppCreatedResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useClipboard } from '@/hooks/useClipboard';

interface AddConnectorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddConnectorModal({ onClose, onSuccess }: AddConnectorModalProps) {
  const t = useTranslations('Connectors');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createdConnector, setCreatedConnector] = useState<AppCreatedResponse | null>(null);
  const { copied, copy } = useClipboard();

  const { loading, error, handleSubmit } = useAsyncForm<AppCreatedResponse>({
    onSuccess: setCreatedConnector,
    defaultError: 'Failed to create connector',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createApp({
        name,
        description: description || undefined,
        connectorCode: 'app',
      })
    );

  const handleClose = () => {
    if (createdConnector) {
      onSuccess();
    }
    onClose();
  };

  const handleCopy = () => {
    if (createdConnector) {
      copy(createdConnector.fullKey);
    }
  };

  if (createdConnector) {
    return (
      <Modal isOpen={true} onClose={handleClose} title={t('connectorKeyCreated')}>
        <div className="space-y-4">
          <Alert variant="warning">
            <p className="font-medium">
              {t('saveKeyWarning')}
            </p>
            <p className="text-xs mt-1">
              {t('saveKeyWarningDetail')}
            </p>
          </Alert>

          <FormField label={t('connectorKey')}>
            <div className="flex gap-2">
              <Input
                type="text"
                value={createdConnector.fullKey}
                readOnly
                className="flex-1 font-mono text-sm select-all"
              />
              <Button onClick={handleCopy} className="flex items-center gap-2 whitespace-nowrap">
                {copied ? (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-5 w-5" />
                    {t('copy')}
                  </>
                )}
              </Button>
            </div>
          </FormField>

          <Alert variant="info">
            <p className="text-sm">
              <strong>{t('name')}:</strong> {createdConnector.name}
            </p>
            {createdConnector.description && createdConnector.description.trim() && (
              <p className="text-sm mt-1">
                <strong>{t('description')}:</strong> {createdConnector.description}
              </p>
            )}
          </Alert>

          <Button onClick={handleClose} className="w-full">
            {t('done')}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={t('createConnector')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label={t('name')} required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('connectorNamePlaceholder')}
            required
            maxLength={100}
          />
        </FormField>

        <FormField label={t('description')}>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
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
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            loading={loading}
            className="flex-1"
          >
            {t('create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
