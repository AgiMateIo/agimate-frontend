'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { useAgentConnectionPoliciesQuery } from '@/queries/agents';
import { AgentConnectionResponse, AgentConnectionPolicyResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import AddConnectionPolicyModal from './AddConnectionPolicyModal';

interface ConnectionPoliciesPanelProps {
  connection: AgentConnectionResponse;
}

export default function ConnectionPoliciesPanel({ connection }: ConnectionPoliciesPanelProps) {
  const t = useTranslations('Agents');
  const { data: policies, isPending: loading, error, refetch } =
    useAgentConnectionPoliciesQuery(connection.id);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AgentConnectionPolicyResponse | null>(null);
  const [deleting, setDeleting] = useState<AgentConnectionPolicyResponse | null>(null);

  const handleSuccess = () => {
    setShowAdd(false);
    setEditing(null);
    setDeleting(null);
    refetch();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">{t('connectionPolicies')}</span>
        <Button onClick={() => setShowAdd(true)} variant="secondary" className="flex items-center gap-1.5 text-xs px-2.5 py-1">
          <PlusIcon className="h-3.5 w-3.5" />
          {t('addPolicy')}
        </Button>
      </div>

      {error ? (
        <ErrorAlert>{getErrorMessage(error, 'Failed to load policies')}</ErrorAlert>
      ) : loading ? (
        <div className="text-center py-4 text-muted text-sm">{t('loadingPolicies')}</div>
      ) : policies.length === 0 ? (
        <div className="text-sm text-muted py-2">{t('noPoliciesDefaultAllow')}</div>
      ) : (
        <div className="space-y-1.5">
          {policies.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-secondary text-muted">
                {p.kind === 'TOOL' ? t('kindTool') : t('kindTrigger')}
              </span>
              <span className="text-sm font-mono text-foreground truncate">
                {p.name ?? t('policyResourceAll')}
              </span>
              {p.paramsFilter && Object.keys(p.paramsFilter).length > 0 && (
                <span
                  className="text-[10px] text-muted font-mono truncate max-w-[40%]"
                  title={JSON.stringify(p.paramsFilter)}
                >
                  {JSON.stringify(p.paramsFilter)}
                </span>
              )}
              <span
                className={`ml-auto shrink-0 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  p.effect === 'ALLOW' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                }`}
              >
                {p.effect === 'ALLOW' ? t('effectAllow') : t('effectDeny')}
              </span>
              <button
                onClick={() => setEditing(p)}
                className="shrink-0 p-1 rounded text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleting(p)}
                className="shrink-0 p-1 rounded text-muted hover:text-error hover:bg-error/10 transition-colors"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddConnectionPolicyModal connection={connection} onClose={() => setShowAdd(false)} onSuccess={handleSuccess} />
      )}
      {editing && (
        <AddConnectionPolicyModal
          connection={connection}
          policy={editing}
          onClose={() => setEditing(null)}
          onSuccess={handleSuccess}
        />
      )}
      {deleting && (
        <DeletePolicyModal
          connection={connection}
          policy={deleting}
          onClose={() => setDeleting(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function DeletePolicyModal({
  connection,
  policy,
  onClose,
  onSuccess,
}: {
  connection: AgentConnectionResponse;
  policy: AgentConnectionPolicyResponse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');

  return (
    <ConfirmDeleteModal
      title={t('deletePolicy')}
      confirmLabel={t('deletePolicy')}
      cancelLabel={tCommon('cancel')}
      defaultError="Failed to delete policy"
      fullWidthButtons
      onConfirm={() => apiService.deleteAgentConnectionPolicy(connection.id, policy.id)}
      onClose={onClose}
      onSuccess={onSuccess}
    >
      <p className="text-foreground">{t('deletePolicyConfirm')}</p>
      <div className="text-sm text-muted font-mono">
        {policy.kind} · {policy.name ?? t('policyResourceAll')} · {policy.effect}
      </div>
    </ConfirmDeleteModal>
  );
}
