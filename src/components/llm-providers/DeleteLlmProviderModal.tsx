'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteLlmProviderModalProps {
  provider: LlmProviderResponse;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

export default function DeleteLlmProviderModal({ provider, onClose, onSuccess }: DeleteLlmProviderModalProps) {
  const t = useTranslations('LlmProviders');

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess: () => onSuccess(provider.id),
    defaultError: 'Failed to delete provider',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () => apiService.deleteLlmProvider(provider.id));

  return (
    <Modal isOpen={true} onClose={onClose} title={`${t('deleteProvider')}: ${provider.name}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Alert variant="warning">
          <p className="font-medium">{t('deleteWarning')}</p>
          <p className="text-xs mt-1">{t('deleteCascadeWarning')}</p>
        </Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="danger" loading={loading} disabled={loading}>
            {t('delete')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
