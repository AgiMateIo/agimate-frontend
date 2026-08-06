'use client';

import { useTranslations } from 'next-intl';
import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { useClipboard } from '@/hooks/useClipboard';
import {
  MCP_LIMITS,
  buildMcpClientConfig,
  getMcpEndpointUrl,
  mcpToolPrefix,
} from '@/utils/agent';
import type { AgentConnectionResponse } from '@/types';

interface McpConnectPanelProps {
  // The agent key, available only right after creation or a rotation. Without
  // one the snippet keeps its shape and marks the spot the key goes in — the
  // user is usually here to re-read the URL, not the secret.
  agentKey?: string | null;
  // Bound connections: their codes are the prefix of every tool name the client
  // will see. There is no endpoint to preview the tools themselves yet.
  connections?: Pick<AgentConnectionResponse, 'id' | 'name' | 'fullCode'>[];
}

function CopyButton({ value, title }: { value: string; title: string }) {
  const { copied, copy } = useClipboard();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      title={title}
      aria-label={title}
      className="shrink-0 p-2 rounded-lg border border-border/50 hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
    >
      {copied ? (
        <ClipboardDocumentCheckIcon className="w-5 h-5 text-success" />
      ) : (
        <ClipboardDocumentIcon className="w-5 h-5" />
      )}
    </button>
  );
}

// Everything an external AI client needs to reach this agent: the endpoint, the
// ready-made config block, and the names its tools arrive under. Shared by the
// wizard's final step and the agent's own page — one client is rarely the last.
export default function McpConnectPanel({ agentKey, connections }: McpConnectPanelProps) {
  const t = useTranslations('Agents');
  const tc = useTranslations('Common');

  const endpoint = getMcpEndpointUrl();
  const snippet = buildMcpClientConfig(agentKey || t('mcpKeyPlaceholder'));
  const prefixes = (connections ?? []).map((c) => ({
    id: c.id,
    name: c.name || c.fullCode,
    prefix: mcpToolPrefix(c.fullCode),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('mcpEndpoint')}</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-surface-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground break-all">
            {endpoint}
          </code>
          <CopyButton value={endpoint} title={tc('copy')} />
        </div>
        <p className="text-xs text-muted mt-1">{t('mcpEndpointHint')}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('mcpConfigTitle')}</h3>
        <div className="flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto bg-surface-secondary border border-border/50 rounded-lg px-4 py-3 text-xs font-mono text-foreground">
            {snippet}
          </pre>
          <CopyButton value={snippet} title={tc('copy')} />
        </div>
        {!agentKey && <p className="text-xs text-muted mt-1">{t('mcpConfigNoKeyHint')}</p>}
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">{t('mcpToolNames')}</h3>
        {prefixes.length === 0 ? (
          <p className="text-sm text-muted">{t('mcpToolNamesEmpty')}</p>
        ) : (
          <>
            <ul className="space-y-1">
              {prefixes.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <code className="font-mono text-foreground">{p.prefix}&lt;tool&gt;</code>
                  <span className="text-xs text-muted">{p.name}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-1.5">{t('mcpToolNamesHint')}</p>
          </>
        )}
      </div>

      <p className="text-xs text-muted">
        {t('mcpLimits', {
          calls: MCP_LIMITS.callsPerMinute,
          seconds: MCP_LIMITS.callTimeoutSeconds,
        })}
      </p>
    </div>
  );
}
