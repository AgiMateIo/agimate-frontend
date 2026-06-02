'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentLlmResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteAgentLlmModalProps {
  agentId: string;
  binding: AgentLlmResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAgentLlmModal({ agentId, binding, onClose, onSuccess }: DeleteAgentLlmModalProps) {
  const t = useTranslations('Agents');

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to delete binding',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () => apiService.deleteAgentLlm(agentId, binding.name));

  return (
    <Modal isOpen={true} onClose={onClose} title={t('deleteModelBinding')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">{t('removeBindingConfirm')}</p>
        <div className="text-sm text-muted space-y-1">
          <div><strong>{t('bindingLabel')}:</strong> <span className="font-mono">{binding.name}</span></div>
          <div><strong>{t('provider')}:</strong> {binding.llmProviderName}</div>
          <div><strong>{t('model')}:</strong> <span className="font-mono">{binding.model}</span></div>
        </div>

        <Alert variant="warning">{t('removeBindingWarning')}</Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
            {t('cancel')}
          </Button>
          <Button type="submit" variant="danger" loading={loading} disabled={loading} className="flex-1">
            {t('deleteModelBinding')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
