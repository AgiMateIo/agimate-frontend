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
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { ConnectionAuthBadge } from '@/components/connections/ConnectionAuth';
import { ConnectionAvatar } from '@/components/connections/ConnectionAvatar';

interface BindConnectionModalProps {
  agentId: string;
  // Restrict the picker to this connector (e.g. arriving from a skill's
  // "connect" badge).
  initialConnectorCode?: string;
  // Already open to the agent — offering them again would only produce an error.
  boundConnectionIds?: Set<string>;
  boundConnectorCodes?: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

// What the agent may reach outwards. Two kinds live in one list: an instance of
// an external connector, addressed by its id, and an internal capability
// (memory, board, sheets), addressed by connector code because its single
// instance may not exist yet — the backend materializes it on binding.
export default function BindConnectionModal({
  agentId,
  initialConnectorCode,
  boundConnectionIds,
  boundConnectorCodes,
  onClose,
  onSuccess,
}: BindConnectionModalProps) {
  const t = useTranslations('Agents');
  const [search, setSearch] = useState('');
  // `conn:<id>` for an instance, `code:<connectorCode>` for an internal one.
  const [selected, setSelected] = useState<string>('');

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

  const query = search.trim().toLowerCase();

  const externalRows = useMemo(() => {
    return (connections ?? []).filter((c) => {
      if (initialConnectorCode && c.connectorCode !== initialConnectorCode) return false;
      if (boundConnectionIds?.has(c.id)) return false;
      const connector = connectorByCode.get(c.connectorCode);
      if (connector && isInternalConnector(connector)) return false;
      if (!query) return true;
      const connectorName = connector?.name ?? c.connectorCode;
      return (
        c.name.toLowerCase().includes(query) ||
        c.fullCode.toLowerCase().includes(query) ||
        (c.subCode ?? '').toLowerCase().includes(query) ||
        connectorName.toLowerCase().includes(query)
      );
    });
  }, [connections, connectorByCode, initialConnectorCode, boundConnectionIds, query]);

  const internalRows = useMemo(() => {
    return (catalog ?? []).filter((c) => {
      if (!isInternalConnector(c)) return false;
      if (initialConnectorCode && c.code !== initialConnectorCode) return false;
      if (boundConnectorCodes?.has(c.code)) return false;
      if (!query) return true;
      return c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query);
    });
  }, [catalog, initialConnectorCode, boundConnectorCodes, query]);

  const empty = externalRows.length === 0 && internalRows.length === 0;

  const onSubmit = () =>
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, async () => {
      if (!selected) return;
      const [kind, value] = [selected.slice(0, selected.indexOf(':')), selected.slice(selected.indexOf(':') + 1)];
      await apiService.bindAgentConnection(
        agentId,
        kind === 'code' ? { connectorCode: value } : { connectionId: value },
      );
    });

  const rowClass = (value: string) =>
    `flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
      selected === value ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
    }`;

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
          ) : empty ? (
            <Alert variant="info">{t('noInstances')}</Alert>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {externalRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {t('bindSectionInstances')}
                  </p>
                  {externalRows.map((conn) => {
                    const value = `conn:${conn.id}`;
                    const connectorName =
                      connectorByCode.get(conn.connectorCode)?.name ?? conn.connectorCode;
                    return (
                      <label key={conn.id} className={rowClass(value)}>
                        <input
                          type="radio"
                          name="connection"
                          checked={selected === value}
                          onChange={() => setSelected(value)}
                          className="accent-accent"
                        />
                        <ConnectionAvatar
                          connectorCode={conn.connectorCode}
                          connectorName={conn.name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {conn.name || conn.fullCode}
                            </span>
                            <span className="text-xs text-muted font-mono truncate">{conn.fullCode}</span>
                            {!conn.enabled && <Chip>{t('disabled')}</Chip>}
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

              {internalRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {t('bindSectionInternal')}
                  </p>
                  {internalRows.map((connector) => {
                    const value = `code:${connector.code}`;
                    return (
                      <label key={connector.code} className={rowClass(value)}>
                        <input
                          type="radio"
                          name="connection"
                          checked={selected === value}
                          onChange={() => setSelected(value)}
                          className="accent-accent"
                        />
                        <ConnectionAvatar
                          connectorCode={connector.code}
                          connectorName={connector.name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">
                            {connector.name}
                          </span>
                          <p className="text-xs text-muted mt-0.5 line-clamp-1">
                            {connector.description || connector.code}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted">{t('bindConnectionHint')}</p>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            loading={loading}
            disabled={!selected}
            className="flex-1"
          >
            {t('bind')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
