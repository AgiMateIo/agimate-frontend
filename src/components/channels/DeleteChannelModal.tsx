'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ChannelResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteChannelModalProps {
  channel: ChannelResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteChannelModal({ channel, onClose, onSuccess }: DeleteChannelModalProps) {
  const t = useTranslations('Channels');
  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to delete channel',
  });

  const onConfirm = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.deleteChannel(channel.pubId);
    });

  return (
    <Modal isOpen={true} onClose={loading ? () => {} : onClose} title={t('deleteTitle')} size="sm">
      <form onSubmit={onConfirm} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <p className="text-sm text-foreground">
          {t('deleteConfirm', { name: channel.name })}
        </p>
        <Alert variant="warning">{t('deleteWarning')}</Alert>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="danger" loading={loading}>
            {t('delete')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
