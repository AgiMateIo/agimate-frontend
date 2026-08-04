'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import apiService, { ApiError } from '@/services/api';
import { useFileCacheActions } from '@/queries/files';
import type { UserFileResponse } from '@/types';
import { useFileLabels } from './fileLabels';

export default function DeleteFileModal({
  file,
  onClose,
}: {
  file: UserFileResponse;
  onClose: () => void;
}) {
  const t = useTranslations('Files');
  const tCommon = useTranslations('Common');
  const { displayName } = useFileLabels();
  const { invalidateLists } = useFileCacheActions();

  const handleConfirm = async () => {
    try {
      await apiService.deleteUserFile(file.id);
    } catch (err) {
      // Already deleted (or expired) — the user's intent is satisfied; the
      // refresh below drops the row.
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
  };

  return (
    <ConfirmDeleteModal
      title={t('deleteTitle')}
      confirmLabel={tCommon('delete')}
      cancelLabel={tCommon('cancel')}
      onConfirm={handleConfirm}
      onClose={onClose}
      onSuccess={() => {
        invalidateLists();
        onClose();
      }}
      defaultError={t('deleteFailed')}
    >
      <p className="text-sm text-foreground">
        {t('deleteConfirm', { name: displayName(file) })}
      </p>
      {/* Deletion is not scoped to this screen: the same file is what a chat
          message, a task comment or a spreadsheet cell points at. */}
      <Alert variant="warning">{t('deleteBreaksLinks')}</Alert>
    </ConfirmDeleteModal>
  );
}
