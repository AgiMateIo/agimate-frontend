'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { isInternalConnector } from '@/utils/connector';
import { connectorCatalogOptions } from '@/queries/connectors';
import { connectionsListOptions } from '@/queries/connections';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { ConnectionAuthBadge } from '@/components/connections/ConnectionAuth';

interface BindConnectionModalProps {
  agentId: string;
  // Restrict the picker to this connector's connections (e.g. clicking a
  // "waiting for connection" badge on the skills tab).
  initialConnectorCode?: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Binds an existing *external* connection (telegram/mcp/app instance) to the
// agent. Internal connectors cannot be bound here — their bindings are synced
// automatically from the agent's skills.
export default function BindConnectionModal({
  agentId,
  initialConnectorCode,
  onClose,
  onSuccess,
}: BindConnectionModalProps) {
  const t = useTranslations('Agents');
  const [search, setSearch] = useState('');
  const [connectionId, setConnectionId] = useState<string | undefined>(undefined);

  const { data: catalog, isPending: catalogPending } = useQuery(connectorCatalogOptions());
  const { data: connections, isPending: connectionsPending } = useQuery(connectionsListOptions());
  const isLoading = catalogPending || connectionsPending;

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to bind connection',
  });

  const connectorByCode = useMemo(
    () => new Map((catalog ?? []).map((c) => [c.code, c])),
    [catalog],
  );

  // Only external connections are bindable; internal system rows are hidden.
  const bindable = useMemo(() => {
    return (connections ?? []).filter((c) => {
      if (initialConnectorCode && c.connectorCode !== initialConnectorCode) return false;
      const connector = connectorByCode.get(c.connectorCode);
      return connector ? !isInternalConnector(connector) : true;
    });
  }, [connections, connectorByCode, initialConnectorCode]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bindable;
    return bindable.filter((c) => {
      const connectorName = connectorByCode.get(c.connectorCode)?.name ?? c.connectorCode;
      return (
        c.name.toLowerCase().includes(query) ||
        c.fullCode.toLowerCase().includes(query) ||
        (c.subCode ?? '').toLowerCase().includes(query) ||
        connectorName.toLowerCase().includes(query)
      );
    });
  }, [bindable, connectorByCode, search]);

  const onSubmit = () =>
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, async () => {
      if (!connectionId) return;
      await apiService.bindAgentConnection(agentId, { connectionId });
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t('bindConnectionTitle')} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted">{t('selectConnection')}</p>
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={t('searchConnections')}
          size="sm"
        />

        <div className="min-h-[160px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted text-sm">{t('loadingInstances')}</div>
          ) : bindable.length === 0 ? (
            <Alert variant="info">{t('noInstances')}</Alert>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">{t('noConnectionsFound')}</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filtered.map((conn) => {
                const connectorName =
                  connectorByCode.get(conn.connectorCode)?.name ?? conn.connectorCode;
                return (
                  <label
                    key={conn.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      connectionId === conn.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="connection"
                      checked={connectionId === conn.id}
                      onChange={() => setConnectionId(conn.id)}
                      className="accent-accent"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {conn.name || conn.fullCode}
                        </span>
                        <span className="text-xs text-muted font-mono truncate">{conn.fullCode}</span>
                        {!conn.enabled && (
                          <span className="shrink-0 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted/10 text-muted">
                            {t('disabled')}
                          </span>
                        )}
                        {/* Bindable, but it has no tools until authorized —
                            better seen here than as an agent that stays silent. */}
                        <ConnectionAuthBadge status={conn.authStatus} />
                      </div>
                      <p className="text-xs text-muted mt-0.5">{connectorName}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted">{t('internalConnectorsHint')}</p>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            loading={loading}
            disabled={!connectionId}
            className="flex-1"
          >
            {t('bind')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
