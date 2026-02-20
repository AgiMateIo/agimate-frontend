'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgenticTeam } from '@/types/agentic-teams';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface EditTeamModalProps {
  team: AgenticTeam;
  onClose: () => void;
  onUpdated: (team: AgenticTeam) => void;
  onDeleted: () => void;
}

export default function EditTeamModal({ team, onClose, onUpdated, onDeleted }: EditTeamModalProps) {
  const t = useTranslations('AgenticTeams');
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { loading: saving, error: saveError, handleSubmit: handleSave } = useAsyncForm({
    onSuccess: () => {},
    defaultError: t('editError'),
  });

  const { loading: deleting, error: deleteError, handleSubmit: handleDelete } = useAsyncForm({
    onSuccess: onDeleted,
    defaultError: t('deleteError'),
  });

  const onSave = (e: React.FormEvent) =>
    handleSave(e, async () => {
      const updated = await apiService.updateAgenticTeam(team.id, {
        name: name.trim(),
        description: description.trim(),
      });
      onUpdated(updated);
    });

  const onDelete = (e: React.FormEvent) =>
    handleDelete(e, async () => {
      await apiService.deleteAgenticTeam(team.id);
    });

  const error = saveError || deleteError;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('editTeam')} size="sm">
      {!showDeleteConfirm ? (
        <form onSubmit={onSave} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <FormField label={t('teamName')} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('teamNamePlaceholder')}
              maxLength={100}
              required
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
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
            >
              {t('delete')}
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={!name.trim() || (name.trim() === team.name && description.trim() === team.description)}
            >
              {t('save')}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={onDelete} className="space-y-4">
          {deleteError && <Alert variant="error">{deleteError}</Alert>}

          <p className="text-foreground">
            {t('deleteTeamConfirm', { name: team.name })}
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={deleting}
              className="flex-1"
            >
              {t('delete')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
