'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentSkillResponse, PolicyDiffResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import PolicyDiffPreview from './PolicyDiffPreview';

interface DeleteAgentSkillModalProps {
  agentPubId: string;
  binding: AgentSkillResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAgentSkillModal({ agentPubId, binding, onClose, onSuccess }: DeleteAgentSkillModalProps) {
  const t = useTranslations('Agents');

  const [diff, setDiff] = useState<PolicyDiffResponse | null>(null);
  const [diffLoading, setDiffLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiService.getSkillPolicyDiff(agentPubId, binding.skillPubId, 'remove')
      .then(data => { if (!cancelled) setDiff(data); })
      .catch(() => { if (!cancelled) setDiff(null); })
      .finally(() => { if (!cancelled) setDiffLoading(false); });
    return () => { cancelled = true; };
  }, [agentPubId, binding.skillPubId]);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to unbind skill',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.unbindAgentSkill(agentPubId, binding.skillPubId);
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t('removeSkill')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">
          {t('removeSkillConfirm')}
        </p>
        <div className="text-sm text-muted">
          <strong>{t('skillName')}:</strong> {binding.skillName ?? binding.skillPubId}
        </div>

        {/* Policy diff preview */}
        <div className="bg-surface-secondary rounded-lg border border-border p-3">
          <div className="text-xs font-medium text-foreground mb-2">{t('policyChangesPreview')}</div>
          {diffLoading ? (
            <div className="text-xs text-muted">{t('loadingPolicyDiff')}</div>
          ) : diff ? (
            <PolicyDiffPreview diff={diff} />
          ) : null}
        </div>

        <Alert variant="warning">
          {t('removeSkillWarning')}
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
            {t('removeSkill')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
