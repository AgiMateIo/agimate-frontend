'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface CreateTeamModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTeamModal({ onClose, onSuccess }: CreateTeamModalProps) {
  const t = useTranslations('AgenticTeams');
  const tCommon = useTranslations('Common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess,
    defaultError: 'Failed to create team',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.createAgenticTeam({
        name: name.trim(),
        description: description.trim(),
      });
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t('createTeam')}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <FormField label={t('teamName')} required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('teamNamePlaceholder')}
            required
            maxLength={100}
          />
        </FormField>

        <FormField label={t('teamDescription')}>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('teamDescriptionPlaceholder')}
            maxLength={500}
            rows={3}
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!name.trim()}
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
