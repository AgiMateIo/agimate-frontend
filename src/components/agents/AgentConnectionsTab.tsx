'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentConnectionResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { PlusIcon, TrashIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import BindConnectionModal from './BindConnectionModal';
import ConnectionPoliciesPanel from './ConnectionPoliciesPanel';

interface AgentConnectionsTabProps {
  agentId: string;
}

export default function AgentConnectionsTab({ agentId }: AgentConnectionsTabProps) {
  const t = useTranslations('Agents');
  const [connections, setConnections] = useState<AgentConnectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBind, setShowBind] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unbinding, setUnbinding] = useState<AgentConnectionResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getAgentConnections(agentId);
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingConnections')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">{t('connectionsTotal', { count: connections.length })}</div>
        <Button onClick={() => setShowBind(true)} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          {t('addConnection')}
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-12 text-muted">{t('noConnections')}</div>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => {
            const expanded = expandedId === conn.id;
            return (
              <div key={conn.id} className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors">
                  <button
                    onClick={() => setExpandedId(expanded ? null : conn.id)}
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                  >
                    <ChevronRightIcon
                      className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{conn.name}</span>
                        <span className="text-xs text-muted font-mono truncate">{conn.fullCode}</span>
                      </div>
                    </div>
                  </button>
                  <span className="shrink-0 inline-block rounded px-2 py-0.5 text-[10px] font-medium bg-surface-secondary border border-border text-muted">
                    {t(`scopeName.${conn.identityScope}`)}
                  </span>
                  {!conn.enabled && (
                    <span className="shrink-0 inline-block rounded px-2 py-0.5 text-[10px] font-medium bg-muted/10 text-muted">
                      {t('disabled')}
                    </span>
                  )}
                  <button
                    onClick={() => setUnbinding(conn)}
                    className="shrink-0 p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                    title={t('unbindConnection')}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                {expanded && (
                  <div className="border-t border-border bg-surface-secondary/40 px-4 py-3">
                    <ConnectionPoliciesPanel connection={conn} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showBind && (
        <BindConnectionModal
          agentId={agentId}
          onClose={() => setShowBind(false)}
          onSuccess={() => {
            setShowBind(false);
            fetchData();
          }}
        />
      )}

      {unbinding && (
        <UnbindConnectionModal
          agentId={agentId}
          connection={unbinding}
          onClose={() => setUnbinding(null)}
          onSuccess={() => {
            setUnbinding(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function UnbindConnectionModal({
  agentId,
  connection,
  onClose,
  onSuccess,
}: {
  agentId: string;
  connection: AgentConnectionResponse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations('Agents');
  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to remove connection',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.unbindAgentConnection(agentId, connection.id);
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t('unbindConnection')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">{t('unbindConnectionConfirm')}</p>
        <div className="text-sm text-muted">
          <strong>{connection.name}</strong> <span className="font-mono">{connection.fullCode}</span>
        </div>
        <Alert variant="warning">{t('unbindConnectionWarning')}</Alert>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
            {t('cancel')}
          </Button>
          <Button type="submit" variant="danger" loading={loading} disabled={loading} className="flex-1">
            {t('unbindConnection')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
