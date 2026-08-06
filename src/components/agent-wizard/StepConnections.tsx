'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { CheckIcon } from '@heroicons/react/24/outline';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ConnectionAuthBadge } from '@/components/connections/ConnectionAuth';
import { ConnectionAvatar } from '@/components/connections/ConnectionAvatar';
import { connectorCatalogOptions } from '@/queries/connectors';
import { connectionsListOptions } from '@/queries/connections';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { isInternalConnector } from '@/utils/connector';
import type { WizardConnection, WizardStepProps } from './AgentWizard';
import { createAgentFromWizard, internalCodesFor } from './createAgent';
import WizardActions from './WizardActions';

// The connector that manages the platform itself — it can create agents and
// keys. An external agent's key lives in someone else's config file, so this one
// is never offered here, whatever the user's connections list holds.
const PLATFORM_CONNECTOR_CODE = 'platform';

export default function StepConnections({
  data,
  setData,
  goNext,
  goBack,
  teamId,
  final = false,
}: WizardStepProps & {
  // Last step before the finish (the external branch has no skills step), so
  // this is where the agent gets created.
  final?: boolean;
}) {
  const t = useTranslations('AgentWizard');
  const [search, setSearch] = useState('');

  const [{ data: catalog, isPending: catalogPending }, { data: connections, isPending: connectionsPending }] =
    useQueries({ queries: [connectorCatalogOptions(), connectionsListOptions()] });
  const isLoading = catalogPending || connectionsPending;

  const connectorByCode = useMemo(
    () => new Map((catalog ?? []).map((c) => [c.code, c])),
    [catalog],
  );

  // Internal connectors (memory, board, sheets) are not bound by hand — they
  // arrive with the preset's skills, so they are described below, not listed.
  const bindable = useMemo(
    () =>
      (connections ?? []).filter((c) => {
        if (c.connectorCode === PLATFORM_CONNECTOR_CODE) return false;
        const connector = connectorByCode.get(c.connectorCode);
        return connector ? !isInternalConnector(connector) : true;
      }),
    [connections, connectorByCode],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bindable;
    return bindable.filter((c) => {
      const connectorName = connectorByCode.get(c.connectorCode)?.name ?? c.connectorCode;
      return (
        c.name.toLowerCase().includes(query) ||
        c.fullCode.toLowerCase().includes(query) ||
        connectorName.toLowerCase().includes(query)
      );
    });
  }, [bindable, connectorByCode, search]);

  const selectedIds = useMemo(
    () => new Set(data.connections.map((c) => c.id)),
    [data.connections],
  );

  const toggle = (conn: WizardConnection) => {
    setData({
      connections: selectedIds.has(conn.id)
        ? data.connections.filter((c) => c.id !== conn.id)
        : [...data.connections, conn],
    });
  };

  const { loading, error, handleSubmit } = useAsyncForm({ defaultError: t('createError') });

  // Creation and attachment can't be one call: both a binding and an instance
  // choice are addressed by agent id. A failure afterwards therefore leaves a
  // real agent behind — it is reported on the next step, never retried silently.
  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const result = await createAgentFromWizard(data, teamId, internalCodesFor(data, catalog));
      setData({
        created: result.created,
        failedConnections: result.failedConnections,
        failedSkills: result.failedSkills,
      });
      goNext();
    });

  // Enter in the search field must not create the agent — only the button does.
  const blockImplicitSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
    }
  };

  return (
    <form onSubmit={onSubmit} onKeyDown={blockImplicitSubmit}>
      <div className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('connectionsTitle')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('connectionsSubtitle')}</p>
        </div>

        {data.skills.length > 0 && (
          <div className="rounded-lg border border-border bg-surface-secondary/50 p-3">
            <p className="text-xs text-muted">{t('connectionsBuiltInHint')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.skills.map((s) => (
                <Chip key={s.id} tone="accent">
                  {s.title}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {bindable.length > 0 && (
            <SearchToolbar
              value={search}
              onChange={setSearch}
              placeholder={t('searchConnections')}
            />
          )}

          {isLoading ? (
            <div className="space-y-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg border border-border bg-surface-secondary animate-pulse"
                />
              ))}
            </div>
          ) : bindable.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t('noConnectionsYet')}</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t('noConnectionsFound')}</p>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((conn) => {
                const isSelected = selectedIds.has(conn.id);
                const connectorName =
                  connectorByCode.get(conn.connectorCode)?.name ?? conn.connectorCode;
                return (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() =>
                      toggle({
                        id: conn.id,
                        name: conn.name,
                        fullCode: conn.fullCode,
                        connectorCode: conn.connectorCode,
                      })
                    }
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-border hover:bg-surface-secondary'
                    }`}
                  >
                    <span
                      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-border'
                      }`}
                    >
                      {isSelected && <CheckIcon className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <ConnectionAvatar
                      connectorCode={conn.connectorCode}
                      connectorName={conn.name}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {conn.name || conn.fullCode}
                        </span>
                        <span className="truncate font-mono text-xs text-muted">
                          {conn.fullCode}
                        </span>
                        {/* Bindable, but it has no tools until authorized. */}
                        <ConnectionAuthBadge status={conn.authStatus} />
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{connectorName}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}
      </div>

      <WizardActions
        left={
          <Button type="button" variant="secondary" onClick={goBack} disabled={loading}>
            {t('back')}
          </Button>
        }
      >
        <span className="hidden text-xs text-muted sm:inline">
          {t('selectedConnections', { count: data.connections.length })}
        </span>
        {final ? (
          <Button type="submit" loading={loading} disabled={loading || !data.name.trim()}>
            {t('createAgent')}
          </Button>
        ) : (
          <Button type="button" onClick={goNext}>
            {t('next')}
          </Button>
        )}
      </WizardActions>
    </form>
  );
}
