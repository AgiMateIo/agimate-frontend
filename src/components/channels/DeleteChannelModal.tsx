'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ChannelResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteChannelModalProps {
  channel: ChannelResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteChannelModal({ channel, onClose, onSuccess }: DeleteChannelModalProps) {
  const t = useTranslations('Channels');

  const tCommon = useTranslations('Common');
  return (
    <ConfirmDeleteModal
      title={t('deleteTitle')}
      confirmLabel={tCommon('delete')}
      cancelLabel={tCommon('cancel')}
      defaultError="Failed to delete channel"
      size="sm"
      blockCloseWhileLoading
      onConfirm={() => apiService.deleteChannel(channel.id)}
      onClose={onClose}
      onSuccess={onSuccess}
    >
      <p className="text-sm text-foreground">
        {t('deleteConfirm', { name: channel.name })}
      </p>
      <Alert variant="warning">{t('deleteWarning')}</Alert>
    </ConfirmDeleteModal>
  );
}
