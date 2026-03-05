'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentToolPolicyResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteToolPolicyModalProps {
  policy: AgentToolPolicyResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteToolPolicyModal({ policy, onClose, onSuccess }: DeleteToolPolicyModalProps) {
  const t = useTranslations('Agents');

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to delete tool policy',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.deleteAgentToolPolicy(policy.id);
    });

  const displayName = policy.toolName || t('anyWildcard');

  return (
    <Modal isOpen={true} onClose={onClose} title={t('deleteToolPolicy')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">
          {t('deleteToolPolicyConfirm')}
        </p>
        <div className="text-sm text-muted">
          <strong>{t('toolNameColumn')}:</strong> {displayName}
        </div>

        <Alert variant="warning">
          {t('deleteToolPolicyWarning')}
        </Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={loading}
            loading={loading}
            className="flex-1"
          >
            {t('deleteToolPolicy')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
