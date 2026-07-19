'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import {
  ConnectorCatalogEntry,
  ConnectionResponse,
  IdentityScope,
  PagedResponse,
  BindConnectionRequest,
} from '@/types';
import { getConnectorKind } from '@/utils/connector';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { SearchToolbar } from '@/components/ui/SearchToolbar';

const CONNECTOR_PAGE_SIZE = 10;

interface BindConnectionModalProps {
  agentId: string;
  // Skip the connector-picker step with this connector already selected
  // (e.g. clicking a "waiting for connection" badge on the skills tab).
  initialConnectorCode?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'connector' | 'target';

export default function BindConnectionModal({
  agentId,
  initialConnectorCode,
  onClose,
  onSuccess,
}: BindConnectionModalProps) {
  const t = useTranslations('Agents');
  const [step, setStep] = useState<Step>('connector');
  const [connector, setConnector] = useState<ConnectorCatalogEntry | null>(null);

  // connector search (server-side, paginated)
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(0);
  const [connectorsData, setConnectorsData] = useState<PagedResponse<ConnectorCatalogEntry> | null>(null);
  const [connectorsLoading, setConnectorsLoading] = useState(true);

  // instance picker (connection connectors)
  const [credentials, setCredentials] = useState<ConnectionResponse[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [connectionId, setConnectionId] = useState<string | undefined>(undefined);

  // scope picker (contextual connectors)
  const [scope, setScope] = useState<IdentityScope | undefined>(undefined);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to bind connector',
  });

  // Reset to the first page when the debounced search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const fetchConnectors = useCallback(async () => {
    setConnectorsLoading(true);
    try {
      const data = await apiService.getConnectors({
        search: debouncedSearch || undefined,
        page,
        size: CONNECTOR_PAGE_SIZE,
      });
      setConnectorsData(data);
    } catch {
      // ignore — handled by empty state
    } finally {
      setConnectorsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const supportedScopes = connector?.capabilities?.supportedScopes ?? [];
  const needsInstance = supportedScopes.includes('INSTANCE');
  // contextual scopes the user might choose between (excludes INSTANCE)
  const contextualScopes = supportedScopes.filter((s) => s !== 'INSTANCE');

  // Load connection instances when advancing to the target step for any INSTANCE
  // connector — apps included (their instances live in /connections just like
  // integrations; they simply have no credential fields to fill in).
  useEffect(() => {
    if (step !== 'target' || !connector || !needsInstance) return;
    let cancelled = false;
    setCredentialsLoading(true);
    apiService
      .getConnections(connector.code)
      .then((data) => {
        if (!cancelled) setCredentials(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCredentialsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, connector, needsInstance]);

  const selectConnector = useCallback((c: ConnectorCatalogEntry) => {
    setConnector(c);
    setConnectionId(undefined);
    // preselect the default scope when contextual: default = supportedScopes[0],
    // which for a contextual connector is the first entry of ctx.
    const ctx = (c.capabilities?.supportedScopes ?? []).filter((s) => s !== 'INSTANCE');
    setScope(ctx[0]);
  }, []);

  // Preselected connector (skills-tab badge): resolve it and jump to the
  // target step; falls back to the regular picker if the fetch fails.
  useEffect(() => {
    if (!initialConnectorCode) return;
    let cancelled = false;
    apiService
      .getConnector(initialConnectorCode)
      .then((c) => {
        if (cancelled) return;
        selectConnector(c);
        setStep('target');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialConnectorCode, selectConnector]);

  const onSubmit = () =>
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, async () => {
      if (!connector) return;
      const body: BindConnectionRequest = { connectorCode: connector.code };
      if (needsInstance) {
        body.connectionId = connectionId;
      } else {
        body.scope = scope ?? connector.capabilities?.supportedScopes[0] ?? null;
      }
      await apiService.bindAgentConnection(agentId, body);
    });

  const connectors = connectorsData?.content ?? [];
  const totalPages = connectorsData?.totalPages ?? 0;
  const totalElements = connectorsData?.totalElements ?? 0;

  // an INSTANCE connector with no instances → user must create one first
  const noInstancesAvailable = needsInstance && !credentialsLoading && credentials.length === 0;

  const canBind = step === 'target' && !!connector && (needsInstance ? !!connectionId : !!scope || contextualScopes.length === 0);

  return (
    <Modal isOpen={true} onClose={onClose} title={t('bindConnectionTitle')} size="lg">
      <div className="space-y-4">
        {step === 'connector' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('selectConnector')}</p>
            <SearchToolbar
              value={search}
              onChange={setSearch}
              placeholder={t('searchConnectors')}
              size="sm"
            />
            <div className="min-h-[200px]">
              {connectorsLoading ? (
                <div className="text-center py-8 text-muted text-sm">{t('loadingConnectors')}</div>
              ) : connectors.length === 0 ? (
                <div className="text-center py-8 text-muted text-sm">{t('noConnectorsFound')}</div>
              ) : (
                <div className="space-y-2">
                  {connectors.map((c) => (
                    <label
                      key={c.code}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        connector?.code === c.code ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="connector"
                        checked={connector?.code === c.code}
                        onChange={() => selectConnector(c)}
                        className="accent-accent"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{c.name}</span>
                          <span className="text-xs text-muted font-mono">{c.code}</span>
                          <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight bg-surface-secondary text-muted">
                            {getConnectorKind(c)}
                          </span>
                        </div>
                        {c.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{c.description}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-3 text-xs text-muted">
                <span>
                  {page * CONNECTOR_PAGE_SIZE + 1}–{Math.min((page + 1) * CONNECTOR_PAGE_SIZE, totalElements)} /{' '}
                  {totalElements}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                    className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'target' && connector && (
          <div className="space-y-3">
            <div className="text-sm text-muted">
              {t('selectConnector')}: <span className="text-foreground font-medium">{connector.name}</span>
            </div>

            {/* INSTANCE connector (integration or app) → pick an instance */}
            {needsInstance && (
              <>
                <p className="text-sm text-muted">{t('selectInstance')}</p>
                {credentialsLoading ? (
                  <div className="text-center py-4 text-muted text-sm">{t('loadingInstances')}</div>
                ) : noInstancesAvailable ? (
                  <Alert variant="info">{t('noInstances')}</Alert>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {credentials.map((cred) => (
                      <label
                        key={cred.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          connectionId === cred.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="instance"
                          checked={connectionId === cred.id}
                          onChange={() => setConnectionId(cred.id)}
                          className="accent-accent"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">{cred.name || cred.fullCode}</span>
                          {cred.name && cred.subCode && <span className="text-xs text-muted ml-2 font-mono">{cred.subCode}</span>}
                          {!cred.enabled && (
                            <span className="ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted/10 text-muted">
                              {t('disabled')}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Contextual → pick a scope (e.g. memory: personal vs team) */}
            {!needsInstance && contextualScopes.length > 1 && (
              <>
                <p className="text-sm text-muted">{t('selectScope')}</p>
                <div className="space-y-2">
                  {contextualScopes.map((s) => (
                    <label
                      key={s}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        scope === s ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={scope === s}
                        onChange={() => setScope(s)}
                        className="accent-accent"
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">{t(`scopeName.${s}`)}</span>
                        <p className="text-xs text-muted mt-0.5">{t(`scopeDesc.${s}`)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* Contextual single scope → nothing to choose, just confirm */}
            {!needsInstance && contextualScopes.length <= 1 && (
              <Alert variant="info">
                {t('bindScopeSingle', { scope: t(`scopeName.${scope ?? connector.capabilities?.supportedScopes[0] ?? 'AGENT'}`) })}
              </Alert>
            )}

            {error && <ErrorAlert>{error}</ErrorAlert>}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step === 'connector' ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                {t('cancel')}
              </Button>
              <Button type="button" onClick={() => setStep('target')} disabled={!connector} className="flex-1">
                {t('nextStep')}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setStep('connector')} className="flex-1">
                {t('backStep')}
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                loading={loading}
                disabled={!canBind || noInstancesAvailable}
                className="flex-1"
              >
                {t('bind')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
