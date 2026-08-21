'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { AgentConnectionResponse } from '@/types';
import { agentConnectionsOptions, useAgentCacheActions } from '@/queries/agents';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import {
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ConnectionAvatar } from '@/components/connections/ConnectionAvatar';
import BindConnectionModal from './BindConnectionModal';
import ConnectionPoliciesPanel from './ConnectionPoliciesPanel';

interface AgentConnectionsTabProps {
  agentId: string;
  // Connector code requested from the skills tab's "connect" badge — opens the
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
  const { invalidateAgentAccess } = useAgentCacheActions();

  const { data: connections, isPending, error } = useQuery(agentConnectionsOptions(agentId));

  const [showBind, setShowBind] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unbinding, setUnbinding] = useState<AgentConnectionResponse | null>(null);

  // A badge click on the skills tab lands here with a connector to preselect —
  // derived rather than synced, so the modal opens with the URL and closes with
  // it (the page clears the parameter through onBindConnectorHandled).
  const bindOpen = showBind || !!bindConnectorCode;

  if (error) {
    return <ErrorAlert>{getErrorMessage(error, 'Failed to load connections')}</ErrorAlert>;
  }

  if (isPending) {
    return <div className="text-center py-12 text-muted">{t('loadingConnections')}</div>;
  }

  const rows = connections ?? [];
  const unused = rows.filter((c) => c.usedBySkills === 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">{t('connectionsTotal', { count: rows.length })}</div>
        <Button onClick={() => setShowBind(true)} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          {t('addConnection')}
        </Button>
      </div>

      {/* Behind the skill gate a connection no skill points at contributes
          nothing to the agent's context — open, but silent. */}
      {unused.length > 0 && (
        <Alert variant="warning">{t('connectionsUnusedSummary', { count: unused.length })}</Alert>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-12 text-muted">{t('noConnections')}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((conn) => {
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
                    <ConnectionAvatar
                      connectorCode={conn.connectorCode}
                      connectorName={conn.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{conn.name}</span>
                        <span className="text-xs text-muted font-mono truncate">{conn.fullCode}</span>
                      </div>
                    </div>
                  </button>
                  {conn.usedBySkills === 0 ? (
                    <span className="shrink-0" title={t('usedByNoSkillsHint')}>
                      <Chip tone="warning" icon={ExclamationTriangleIcon}>
                        {t('usedByNoSkills')}
                      </Chip>
                    </span>
                  ) : (
                    <span className="shrink-0">
                      <Chip tone="accent">{t('usedBySkills', { count: conn.usedBySkills })}</Chip>
                    </span>
                  )}
                  {conn.managedBySkills && (
                    <span className="shrink-0" title={t('internalConnectionHint')}>
                      <Chip>{t('internalConnection')}</Chip>
                    </span>
                  )}
                  {!conn.enabled && (
                    <span className="shrink-0">
                      <Chip>{t('disabled')}</Chip>
                    </span>
                  )}
                  {/* Internal connectors unbind like any other now — there is no
                      skill sync left to undo it behind the user's back. */}
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

      {bindOpen && (
        <BindConnectionModal
          agentId={agentId}
          initialConnectorCode={bindConnectorCode ?? undefined}
          boundConnectionIds={new Set(rows.map((c) => c.connectionId))}
          boundConnectorCodes={new Set(rows.map((c) => c.connectorCode))}
          onClose={() => {
            setShowBind(false);
            onBindConnectorHandled?.();
          }}
          onSuccess={() => {
            setShowBind(false);
            onBindConnectorHandled?.();
            invalidateAgentAccess(agentId);
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
            invalidateAgentAccess(agentId);
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
  const tCommon = useTranslations('Common');

  return (
    <ConfirmDeleteModal
      title={t('unbindConnection')}
      confirmLabel={t('unbindConnection')}
      cancelLabel={tCommon('cancel')}
      defaultError="Failed to remove connection"
      fullWidthButtons
      confirmVariant="danger"
      onConfirm={() => apiService.unbindAgentConnection(agentId, connection.connectionId)}
      onClose={onClose}
      onSuccess={onSuccess}
    >
      <p className="text-foreground">{t('unbindConnectionConfirm')}</p>
      <div className="text-sm text-muted">
        <strong>{connection.name}</strong> <span className="font-mono">{connection.fullCode}</span>
      </div>
      {/* The count is the whole point of the warning: those skills stop reaching
          the agent the moment the connection goes. */}
      <Alert variant="warning">
        {connection.usedBySkills > 0
          ? t('unbindConnectionBreaksSkills', { count: connection.usedBySkills })
          : t('unbindConnectionWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
