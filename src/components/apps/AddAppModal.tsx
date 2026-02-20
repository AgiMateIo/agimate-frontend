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

interface AddAppModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAppModal({ onClose, onSuccess }: AddAppModalProps) {
  const t = useTranslations('Apps');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createdApp, setCreatedApp] = useState<AppCreatedResponse | null>(null);
  const { copied, copy } = useClipboard();

  const { loading, error, handleSubmit } = useAsyncForm<AppCreatedResponse>({
    onSuccess: setCreatedApp,
    defaultError: 'Failed to create app',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createApp({
        name,
        description: description || undefined,
      })
    );

  const handleClose = () => {
    if (createdApp) {
      onSuccess();
    }
    onClose();
  };

  const handleCopy = () => {
    if (createdApp) {
      copy(createdApp.fullKey);
    }
  };

  if (createdApp) {
    return (
      <Modal isOpen={true} onClose={handleClose} title={t('appKeyCreated')}>
        <div className="space-y-4">
          <Alert variant="warning">
            <p className="font-medium">
              {t('saveKeyWarning')}
            </p>
            <p className="text-xs mt-1">
              {t('saveKeyWarningDetail')}
            </p>
          </Alert>

          <FormField label={t('appKey')}>
            <div className="flex gap-2">
              <Input
                type="text"
                value={createdApp.fullKey}
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
              <strong>{t('name')}:</strong> {createdApp.name}
            </p>
            {createdApp.description && createdApp.description.trim() && (
              <p className="text-sm mt-1">
                <strong>{t('description')}:</strong> {createdApp.description}
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
    <Modal isOpen={true} onClose={onClose} title={t('createApp')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label={t('name')} required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('appNamePlaceholder')}
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
