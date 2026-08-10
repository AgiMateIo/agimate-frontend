'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { LockClosedIcon, KeyIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import {
  agentConnectionsOptions,
  useAgentDetailSuspenseQuery,
  useAgentSkillsQuery,
} from '@/queries/agents';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import SecretKeyReveal from '@/components/connectors/SecretKeyReveal';
import McpConnectPanel from '@/components/agents/McpConnectPanel';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { isMcpAgent } from '@/utils/agent';

const getAgentTypeColor = (dest: string) => {
  switch (dest) {
    case 'CENTRIFUGO':
      return 'bg-accent/10 text-accent';
    case 'WEBHOOK':
      return 'bg-success/10 text-success';
    case 'GENERIC':
      return 'bg-warning/10 text-warning';
    case 'MCP':
      return 'bg-accent/10 text-accent';
    default:
      return 'bg-muted/10 text-muted';
  }
};

export default function AgentGeneralPage() {
  const t = useTranslations('Agents');
  const locale = useLocale();
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);

  return (
    <>
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        {/* Status & Key ID + Edit */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                agent.enabled ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${agent.enabled ? 'bg-success' : 'bg-muted'}`} />
              {agent.enabled ? t('enabled') : t('disabled')}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-surface-secondary border border-border/50 rounded-full px-3 py-1 text-xs text-muted font-mono">
              <KeyIcon className="h-3 w-3" />
              {agent.maskedKeyId}
            </span>
          </div>
          <Link
            href={`/dashboard/agents/${agent.id}/edit`}
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors shrink-0"
          >
            <PencilIcon className="h-4 w-4" />
            {t('editAgentTitle')}
          </Link>
        </div>

        {/* Description */}
        {agent.description && (
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">{t('description')}</h3>
            <p className="text-sm text-foreground">{agent.description}</p>
          </div>
        )}

        {/* Prompt */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">{t('prompt')}</h3>
          <div className="bg-surface-secondary rounded-lg border border-border/50 p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{agent.instructions}</pre>
          </div>
          {/* Stored, but nothing delivers it to an MCP client yet — it only gets
              tools. Saying so beats a prompt that looks silently ignored. */}
          {isMcpAgent(agent.type) && (
            <p className="text-xs text-muted mt-1">{t('mcpPromptHint')}</p>
          )}
        </div>

        {/* Agent Type */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">{t('agentType')}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${getAgentTypeColor(agent.type)}`}>
              {agent.type}
            </span>
            {agent.type === 'WEBHOOK' && agent.webhookUrl && (
              <span className="inline-block bg-surface-secondary border border-border/50 rounded px-2.5 py-1 text-xs text-muted font-mono">
                {agent.webhookUrl}
              </span>
            )}
            {agent.hasWebhookAuth && (
              <span className="inline-flex items-center gap-1 bg-surface-secondary border border-border/50 rounded px-2.5 py-1 text-xs text-muted">
                <LockClosedIcon className="h-3 w-3" />
                Auth
              </span>
            )}
          </div>
        </div>

        {/* Created At */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">{t('createdAt')}</h3>
          <p className="text-sm text-foreground">{formatDate(agent.createdAt, locale)}</p>
        </div>
      </div>

      <UnsatisfiedSkillsNotice agentId={agent.id} />

      {isMcpAgent(agent.type) && <McpConnectCard agentId={agent.id} />}
    </>
  );
}

// A skill missing its connections is not handed to the agent at all — the agent
// simply cannot do what it was hired for. People complain about the agent long
// before they open its skills section, so the count belongs on the card.
function UnsatisfiedSkillsNotice({ agentId }: { agentId: string }) {
  const t = useTranslations('Agents');
  const { data } = useAgentSkillsQuery(agentId);

  const bindings = data?.content ?? [];
  // `=== false`, not `!`: a backend that has not shipped the verdict yet must
  // read as "nothing to report", not as every skill being broken.
  const broken = bindings.filter((b) => b.satisfied === false).length;
  if (broken === 0) return null;

  return (
    <div className="mt-6">
      <Alert variant="warning">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{t('skillsUnsatisfiedSummary', { count: broken, total: bindings.length })}</span>
          <Link
            href={`/dashboard/agents/${agentId}/skills`}
            className="font-medium underline whitespace-nowrap"
          >
            {t('tabSkills')}
          </Link>
        </div>
      </Alert>
    </div>
  );
}

// Connection details of an MCP agent, plus its key rotation. That key lives in
// someone else's config file, so rotating it is a routine part of running this
// agent — it belongs here, not in a danger zone at the bottom of the edit form.
function McpConnectCard({ agentId }: { agentId: string }) {
  const t = useTranslations('Agents');
  const { data: connections } = useQuery(agentConnectionsOptions(agentId));

  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  const rotate = async () => {
    setRotating(true);
    setRotateError(null);
    try {
      const result = await apiService.regenerateAgentKey(agentId);
      setRotatedKey(result.fullKey);
    } catch (err) {
      setRotateError(getErrorMessage(err, t('regenerateKeyFailed')));
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="mt-6 bg-surface rounded-xl border border-border p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('mcpConnectTitle')}</h2>
        <p className="text-sm text-muted mt-1">{t('mcpConnectSubtitle')}</p>
      </div>

      {/* A freshly rotated key flows straight into the snippet below, so the
          user copies a config that already works instead of splicing it in. */}
      {rotatedKey ? (
        <SecretKeyReveal
          secret={rotatedKey}
          label={t('agentKey')}
          onDone={() => setRotatedKey(null)}
        />
      ) : (
        <>
          {rotateError && <ErrorAlert>{rotateError}</ErrorAlert>}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="warning" onClick={rotate} loading={rotating} disabled={rotating}>
              {t('regenerateKey')}
            </Button>
            <p className="text-xs text-muted">{t('mcpRotateKeyHint')}</p>
          </div>
        </>
      )}

      <McpConnectPanel agentKey={rotatedKey} connections={connections} />
    </div>
  );
}
