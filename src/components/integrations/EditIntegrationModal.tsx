'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { IntegrationResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface EditIntegrationModalProps {
  integration: IntegrationResponse;
  connectorName: string;
  onClose: () => void;
  onSuccess: (integration: IntegrationResponse) => void;
}

export default function EditIntegrationModal({
  integration,
  connectorName,
  onClose,
  onSuccess,
}: EditIntegrationModalProps) {
  const t = useTranslations('Integrations');
  const [name, setName] = useState(integration.name || '');

  const { loading, error, handleSubmit } = useAsyncForm<IntegrationResponse>({
    onSuccess,
    defaultError: t('updateError'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateIntegration(integration.id, {
        name: name.trim() || undefined,
      })
    );

  return (
    <Modal isOpen={true} onClose={onClose} title={t('editIntegration')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label={t('platformName')}>
          <Input
            type="text"
            value={connectorName}
            disabled
          />
        </FormField>

        <FormField label={t('name')}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={100}
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
