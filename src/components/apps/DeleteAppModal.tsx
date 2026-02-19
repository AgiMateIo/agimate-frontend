'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AppResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface DeleteAppModalProps {
  app: AppResponse;
  onClose: () => void;
  onSuccess: (appId: string) => void;
}

export default function DeleteAppModal({ app, onClose, onSuccess }: DeleteAppModalProps) {
  const t = useTranslations('Apps');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await apiService.deleteApp(app.id);
      onSuccess(app.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete app');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('deleteApp')} size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          {t('deleteConfirm', { name: app.name })}
        </p>

        <Alert variant="warning">
          {t('deleteWarning')}
        </Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={deleting}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
            className="flex-1"
          >
            {t('delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
