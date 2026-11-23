'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import type { ConnectionResponse } from '@/types';
import { isIntegrationConnector, isInternalConnector } from '@/utils/connector';
import { getDetailedErrorMessage } from '@/utils/error';
import { connectorCatalogOptions, integrationPlatformsOptions } from '@/queries/connectors';
import { connectionsListOptions } from '@/queries/connections';
import { useAgentCacheActions } from '@/queries/agents';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { ConnectionAuthBadge } from '@/components/connections/ConnectionAuth';
import { ConnectionAvatar } from '@/components/connections/ConnectionAvatar';
import { Placeholder } from '@/components/ui/Placeholder';
import ConnectionSetupFlow, { type FlowStep } from '@/components/connections/ConnectionSetupFlow';

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

type View = 'choose' | 'existing' | 'new';

// What the agent may reach outwards. Two kinds live in one list: an instance of
// an external connector, addressed by its id, and an internal capability
// (memory, board, sheets), addressed by connector code because its single
// instance may not exist yet — the backend materializes it on binding. The
// third way in is a new connection, created by the same sequence the
// connections page uses.
export default function BindConnectionModal({
  agentId,
  initialConnectorCode,
  boundConnectionIds,
  boundConnectorCodes,
  onClose,
  onSuccess,
}: BindConnectionModalProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');
  const tConn = useTranslations('Connections');
  const { invalidateAgentAccess } = useAgentCacheActions();
  const [search, setSearch] = useState('');
  // `conn:<id>` for an instance, `code:<connectorCode>` for an internal one.
  const [selected, setSelected] = useState<string>('');
  // A deep link that names the connector has already answered the fork.
  const [view, setView] = useState<View>(() => (initialConnectorCode ? 'existing' : 'choose'));
  const [newStep, setNewStep] = useState<FlowStep>('pick');

  const { data: catalog, isPending: catalogPending } = useQuery(connectorCatalogOptions());
  const { data: platforms } = useQuery(integrationPlatformsOptions());
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

  const scoped = initialConnectorCode ? connectorByCode.get(initialConnectorCode) : undefined;
  // Only an integration connector can be created; APP and SERVICE cannot, and an
  // unknown code must not lead into an empty "new" branch.
  const canCreateNew = !initialConnectorCode || (scoped != null && isIntegrationConnector(scoped));
  const hasChoose = !initialConnectorCode;

  const query = search.trim().toLowerCase();

  const bindableExternal = useMemo(
    () =>
      (connections ?? []).filter((c) => {
        if (initialConnectorCode && c.connectorCode !== initialConnectorCode) return false;
        if (boundConnectionIds?.has(c.id)) return false;
        const connector = connectorByCode.get(c.connectorCode);
        return !(connector && isInternalConnector(connector));
      }),
    [connections, connectorByCode, initialConnectorCode, boundConnectionIds],
  );

  const externalRows = useMemo(() => {
    if (!query) return bindableExternal;
    return bindableExternal.filter((c) => {
      const connectorName = connectorByCode.get(c.connectorCode)?.name ?? c.connectorCode;
      return (
        (c.name ?? '').toLowerCase().includes(query) ||
        c.fullCode.toLowerCase().includes(query) ||
        (c.subCode ?? '').toLowerCase().includes(query) ||
        connectorName.toLowerCase().includes(query)
      );
    });
  }, [bindableExternal, connectorByCode, query]);

  const bindableInternal = useMemo(
    () =>
      (catalog ?? []).filter((c) => {
        if (!isInternalConnector(c)) return false;
        if (initialConnectorCode && c.code !== initialConnectorCode) return false;
        return !boundConnectorCodes?.has(c.code);
      }),
    [catalog, initialConnectorCode, boundConnectorCodes],
  );

  const internalRows = useMemo(() => {
    if (!query) return bindableInternal;
    return bindableInternal.filter(
      (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query),
    );
  }, [bindableInternal, query]);

  // What the "My connections" card will actually offer.
  const existingCount = bindableExternal.length + bindableInternal.length;
  const empty = externalRows.length === 0 && internalRows.length === 0;
  const searching = query.length > 0;

  const bindCreated = async (connection: ConnectionResponse) => {
    try {
      await apiService.bindAgentConnection(agentId, { connectionId: connection.id });
    } catch (e) {
      throw new Error(
        t('createdNotBound', {
          message: getDetailedErrorMessage(e, t('bindConnectionError')),
        }),
      );
    }
    // Even if the modal is dismissed mid-flight, the tab learns about the binding.
    invalidateAgentAccess(agentId);
  };

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

  const title =
    view === 'new'
      ? newStep === 'pick'
        ? tConn('selectConnector')
        : tConn('configureConnection')
      : t('bindConnectionTitle');
  const size = view === 'new' ? (newStep === 'pick' ? 'xl' : 'md') : 'lg';

  return (
    <Modal isOpen={true} onClose={onClose} title={title} size={size}>
      {view === 'choose' && (
        <div className="space-y-2">
          <ChooseCard
            title={t('bindSectionInstances')}
            hint={t('chooseExistingHint', { count: existingCount })}
            onClick={() => setView('existing')}
          />
          {canCreateNew && (
            <ChooseCard
              title={t('chooseNew')}
              hint={t('chooseNewHint')}
              onClick={() => setView('new')}
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {tCommon('cancel')}
            </Button>
          </div>
        </div>
      )}

      {view === 'existing' && (
        <div className="space-y-4">
          {hasChoose && (
            <button
              type="button"
              onClick={() => setView('choose')}
              className="text-sm text-accent underline hover:no-underline"
            >
              {tCommon('back')}
            </button>
          )}
          <p className="text-sm text-muted">{t('selectConnection')}</p>
          <SearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={t('searchConnections')}
            size="sm"
          />

          <div className="min-h-[160px]">
            {isLoading ? (
              <Placeholder size="sm">{t('loadingInstances')}</Placeholder>
            ) : empty ? (
              searching ? (
                <Placeholder size="sm">{t('noConnectionsFound')}</Placeholder>
              ) : (
                <div className="space-y-3">
                  <Alert variant="info">{t('existingEmpty')}</Alert>
                  {canCreateNew && (
                    <Button variant="secondary" onClick={() => setView('new')}>
                      {t('connectNewAction')}
                    </Button>
                  )}
                </div>
              )
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
                            connectorName={conn.name || conn.fullCode}
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
              {tCommon('cancel')}
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
      )}

      {view === 'new' && (
        <ConnectionSetupFlow
          platforms={platforms ?? []}
          connections={connections ?? []}
          connectorCode={initialConnectorCode}
          onCreated={bindCreated}
          onSuccess={onSuccess}
          onStepChange={setNewStep}
          // A deep link has no fork to go back to; the modal's X is the exit.
          onBack={hasChoose ? () => setView('choose') : undefined}
        />
      )}
    </Modal>
  );
}

function ChooseCard({
  title,
  hint,
  onClick,
}: {
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:border-accent hover:bg-surface-secondary"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-foreground">{title}</span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
      </div>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </button>
  );
}
