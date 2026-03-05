'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentPolicyResponse, PolicyKind } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { getPolicyLabels } from './policyLabels';

interface DeletePolicyModalProps {
  kind: PolicyKind;
  policy: AgentPolicyResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeletePolicyModal({ kind, policy, onClose, onSuccess }: DeletePolicyModalProps) {
  const t = useTranslations('Agents');
  const labels = getPolicyLabels(kind);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to delete policy',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (kind === 'tool') {
        await apiService.deleteAgentToolPolicy(policy.id);
      } else {
        await apiService.deleteAgentTriggerPolicy(policy.id);
      }
    });

  const displayName = policy.resourceName || t('anyWildcard');

  return (
    <Modal isOpen={true} onClose={onClose} title={t(labels.deletePolicy)}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">
          {t(labels.deletePolicyConfirm)}
        </p>
        <div className="text-sm text-muted">
          <strong>{t(labels.resourceColumn)}:</strong> {displayName}
        </div>

        <Alert variant="warning">
          {t(labels.deletePolicyWarning)}
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
            {t(labels.deletePolicy)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
