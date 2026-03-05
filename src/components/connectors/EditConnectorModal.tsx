'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AppResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface EditConnectorModalProps {
  connector: AppResponse;
  onClose: () => void;
  onSuccess: (connector: AppResponse) => void;
}

export default function EditConnectorModal({ connector, onClose, onSuccess }: EditConnectorModalProps) {
  const t = useTranslations('Connectors');
  const [name, setName] = useState(connector.name);
  const [description, setDescription] = useState(connector.description || '');

  const { loading, error, handleSubmit } = useAsyncForm<AppResponse>({
    onSuccess,
    defaultError: 'Failed to update connector',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateApp(connector.pubId, {
        name,
        description: description || undefined,
      })
    );

  return (
    <Modal isOpen={true} onClose={onClose} title={t('editConnector')}>
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
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
