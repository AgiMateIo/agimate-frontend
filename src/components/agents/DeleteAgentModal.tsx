'use client';

import apiService from '@/services/api';
import { AgentSettingsResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteAgentModalProps {
  agent: AgentSettingsResponse;
  apiKeyName: string;
  onClose: () => void;
  onSuccess: (apiKeyPubId: string) => void;
}

export default function DeleteAgentModal({ agent, apiKeyName, onClose, onSuccess }: DeleteAgentModalProps) {
  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess: () => {
      onSuccess(agent.apiKeyPubId);
    },
    defaultError: 'Failed to delete agent configuration',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.deleteAgentSettings(agent.apiKeyPubId);
    });

  return (
    <Modal isOpen={true} onClose={onClose} title="Delete Agent Configuration">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">
          Are you sure you want to delete the agent configuration for <strong>{apiKeyName}</strong>?
        </p>

        <Alert variant="warning">
          This action cannot be undone. The agent will stop processing triggers immediately.
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
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={loading}
            loading={loading}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </form>
    </Modal>
  );
}
