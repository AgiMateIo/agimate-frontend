'use client';

import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  LinkSlashIcon,
} from '@heroicons/react/24/outline';
import apiService, { ApiError } from '@/services/api';
import { agentKeys, agentMcpClientsOptions } from '@/queries/agents';
import { useClipboard } from '@/hooks/useClipboard';
import { getMcpEndpointUrl } from '@/utils/agent';
import { formatDate } from '@/utils/date';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { RowAction } from '@/components/ui/RowAction';
import type { McpClientResponse } from '@/types';

// A CIMD client id is a URL; anything else is shown as it came.
function clientHost(clientId: string): string {
  try {
    return new URL(clientId).host || clientId;
  } catch {
    return clientId;
  }
}

// External clients signing in to the agent by link — the way in that needs no
// key. The key itself stays, under "advanced", for scripts and browserless clients.
export default function McpClientsCard({ agentId, advanced }: { agentId: string; advanced: ReactNode }) {
  const t = useTranslations('Agents');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { copied, copy } = useClipboard();
  const { data: clients, error } = useQuery(agentMcpClientsOptions(agentId));
  const [disconnecting, setDisconnecting] = useState<McpClientResponse | null>(null);

  const endpoint = getMcpEndpointUrl();
  const reload = () => queryClient.invalidateQueries({ queryKey: agentKeys.mcpClients(agentId) });

  return (
    <div className="mt-6 bg-surface rounded-xl border border-border p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('mcpClientsTitle')}</h2>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('mcpClientsEndpoint')}</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-surface-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground break-all">
            {endpoint}
          </code>
          <button
            type="button"
            onClick={() => copy(endpoint)}
            title={tc('copy')}
            aria-label={tc('copy')}
            className="shrink-0 p-2 rounded-lg border border-border/50 hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
          >
            {copied ? (
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-success" />
            ) : (
              <ClipboardDocumentIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted mt-1">{t('mcpClientsEndpointHint')}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('mcpClientsList')}</h3>
        {error ? (
          <ErrorAlert>{t('mcpClientsLoadFailed')}</ErrorAlert>
        ) : !clients ? (
          <p className="text-sm text-muted">{tc('loading')}</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted">{t('mcpClientsEmpty')}</p>
        ) : (
          <ul className="divide-y divide-border/50 rounded-lg border border-border/50">
            {clients.map((client) => (
              <li key={client.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">{client.clientName}</span>
                    <span className="text-xs font-mono text-muted break-all">{clientHost(client.clientId)}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {t('mcpClientConnectedAt', { date: formatDate(client.createdAt, locale) })}
                    {' · '}
                    {client.lastUsedAt
                      ? t('mcpClientLastUsed', { date: formatDate(client.lastUsedAt, locale) })
                      : t('mcpClientNeverUsed')}
                  </p>
                </div>
                <RowAction icon={LinkSlashIcon} label={t('mcpClientDisconnect')} onClick={() => setDisconnecting(client)} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted mt-1.5">{t('mcpClientsExpiryHint')}</p>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
          {t('mcpClientsAdvanced')}
        </summary>
        <div className="mt-4 space-y-5">
          <p className="text-xs text-muted">{t('mcpClientsAdvancedHint')}</p>
          {advanced}
        </div>
      </details>

      {disconnecting && (
        <ConfirmDeleteModal
          title={t('mcpClientDisconnectTitle')}
          confirmLabel={t('mcpClientDisconnect')}
          cancelLabel={tc('cancel')}
          defaultError={t('mcpClientDisconnectFailed')}
          onConfirm={async () => {
            try {
              await apiService.deleteAgentMcpClient(agentId, disconnecting.id);
            } catch (err) {
              // Already gone is what was asked for.
              if (!(err instanceof ApiError && err.status === 404)) throw err;
            }
          }}
          onClose={() => setDisconnecting(null)}
          onSuccess={() => {
            setDisconnecting(null);
            reload();
          }}
        >
          <p className="text-sm text-foreground">
            {t('mcpClientDisconnectConfirm', { name: disconnecting.clientName })}
          </p>
        </ConfirmDeleteModal>
      )}
    </div>
  );
}
