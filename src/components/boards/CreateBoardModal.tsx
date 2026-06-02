'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import apiService from '@/services/api';
import type { Board } from '@/types';

interface CreateBoardModalProps {
  teamId: string;
  onClose: () => void;
  onSuccess: (board: Board) => void;
}

export default function CreateBoardModal({ teamId, onClose, onSuccess }: CreateBoardModalProps) {
  const t = useTranslations('Board');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { loading, error, handleSubmit } = useAsyncForm<Board>({
    onSuccess,
    defaultError: t('createBoardError'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createBoard({
        agenticTeamId: teamId,
        name: name.trim(),
        description: description.trim() || undefined,
      })
    );

  return (
    <Modal isOpen onClose={onClose} title={t('createBoard')}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label={t('boardName')} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('boardNamePlaceholder')}
            required
            maxLength={200}
          />
        </FormField>
        <FormField label={t('boardDescription')}>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('boardDescriptionPlaceholder')}
            maxLength={1000}
            rows={3}
          />
        </FormField>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={!name.trim()} loading={loading} className="flex-1">
            {t('create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
