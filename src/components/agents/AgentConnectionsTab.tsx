'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { AgentConnectionResponse } from '@/types';
import { isInternalConnector } from '@/utils/connector';
import { connectorCatalogOptions } from '@/queries/connectors';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { PlusIcon, TrashIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import BindConnectionModal from './BindConnectionModal';
import ConnectionPoliciesPanel from './ConnectionPoliciesPanel';

interface AgentConnectionsTabProps {
  agentId: string;
  // Connector code requested from the skills tab's "waiting" badge — opens the
  // bind modal with it preselected. Cleared via onBindConnectorHandled.
  bindConnectorCode?: string | null;
  onBindConnectorHandled?: () => void;
}

export default function AgentConnectionsTab({
  agentId,
  bindConnectorCode,
  onBindConnectorHandled,
}: AgentConnectionsTabProps) {
  const t = useTranslations('Agents');
  const [connections, setConnections] = useState<AgentConnectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBind, setShowBind] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unbinding, setUnbinding] = useState<AgentConnectionResponse | null>(null);

  // Internal-connector bindings are synced from skills — no manual unbind.
  const { data: catalog } = useQuery(connectorCatalogOptions());
  const internalCodes = useMemo(
    () => new Set((catalog ?? []).filter(isInternalConnector).map((c) => c.code)),
    [catalog],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getAgentConnections(agentId);
      setConnections(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load connections'));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // A badge click on the skills tab lands here with a connector to preselect.
  useEffect(() => {
    if (bindConnectorCode) setShowBind(true);
  }, [bindConnectorCode]);

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
            const internal = internalCodes.has(conn.connectorCode);
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
                  {internal && (
                    <span
                      className="shrink-0 inline-block rounded px-2 py-0.5 text-[10px] font-medium bg-surface-secondary border border-border text-muted"
                      title={t('managedBySkillsHint')}
                    >
                      {t('managedBySkills')}
                    </span>
                  )}
                  {!conn.enabled && (
                    <span className="shrink-0 inline-block rounded px-2 py-0.5 text-[10px] font-medium bg-muted/10 text-muted">
                      {t('disabled')}
                    </span>
                  )}
                  {!internal && (
                    <button
                      onClick={() => setUnbinding(conn)}
                      className="shrink-0 p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                      title={t('unbindConnection')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
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
          initialConnectorCode={bindConnectorCode ?? undefined}
          onClose={() => {
            setShowBind(false);
            onBindConnectorHandled?.();
          }}
          onSuccess={() => {
            setShowBind(false);
            onBindConnectorHandled?.();
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

  return (
    <ConfirmDeleteModal
      title={t('unbindConnection')}
      confirmLabel={t('unbindConnection')}
      cancelLabel={t('cancel')}
      defaultError="Failed to remove connection"
      fullWidthButtons
      confirmVariant="danger"
      onConfirm={() => apiService.unbindAgentConnection(agentId, connection.id)}
      onClose={onClose}
      onSuccess={onSuccess}
    >
      <p className="text-foreground">{t('unbindConnectionConfirm')}</p>
      <div className="text-sm text-muted">
        <strong>{connection.name}</strong> <span className="font-mono">{connection.fullCode}</span>
      </div>
      <Alert variant="warning">{t('unbindConnectionWarning')}</Alert>
    </ConfirmDeleteModal>
  );
}
