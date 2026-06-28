'use client';

import apiService from '@/services/api';
import { AgentResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteAgentModalProps {
  agent: AgentResponse;
  onClose: () => void;
  onSuccess: (agentId: string) => void;
}

export default function DeleteAgentModal({ agent, onClose, onSuccess }: DeleteAgentModalProps) {
  return (
    <ConfirmDeleteModal
      title="Delete Agent Configuration"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      defaultError="Failed to delete agent configuration"
      fullWidthButtons
      onConfirm={() => apiService.deleteAgent(agent.id)}
      onClose={onClose}
      onSuccess={() => onSuccess(agent.id)}
    >
      <p className="text-foreground">
        Are you sure you want to delete the agent <strong>{agent.name}</strong>?
      </p>

      <Alert variant="warning">
        This action cannot be undone. The agent will stop processing triggers immediately.
      </Alert>
    </ConfirmDeleteModal>
  );
}
