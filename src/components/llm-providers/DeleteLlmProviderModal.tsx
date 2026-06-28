'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteLlmProviderModalProps {
  provider: LlmProviderResponse;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

export default function DeleteLlmProviderModal({ provider, onClose, onSuccess }: DeleteLlmProviderModalProps) {
  const t = useTranslations('LlmProviders');

  return (
    <ConfirmDeleteModal
      title={`${t('deleteProvider')}: ${provider.name}`}
      confirmLabel={t('delete')}
      cancelLabel={t('cancel')}
      defaultError="Failed to delete provider"
      onConfirm={() => apiService.deleteLlmProvider(provider.id)}
      onClose={onClose}
      onSuccess={() => onSuccess(provider.id)}
    >
      <Alert variant="warning">
        <p className="font-medium">{t('deleteWarning')}</p>
        <p className="text-xs mt-1">{t('deleteCascadeWarning')}</p>
      </Alert>
    </ConfirmDeleteModal>
  );
}
