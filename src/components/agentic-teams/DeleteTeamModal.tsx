'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgenticTeam } from '@/types/agentic-teams';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteTeamModalProps {
  team: AgenticTeam;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteTeamModal({ team, onClose, onSuccess }: DeleteTeamModalProps) {
  const t = useTranslations('AgenticTeams');

  const { loading, error, handleSubmit } = useAsyncForm({
    onSuccess,
    defaultError: 'Failed to delete team',
  });

  const handleDelete = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.deleteAgenticTeam(team.id);
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t('deleteTeam')} size="sm">
      <form onSubmit={handleDelete} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <p className="text-foreground">
          {t('deleteTeamConfirm', { name: team.name })}
        </p>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={loading}
            className="flex-1"
          >
            {t('delete')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
