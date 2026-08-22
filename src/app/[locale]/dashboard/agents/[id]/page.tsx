'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { LockClosedIcon, KeyIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Link, useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import type { AgentType, PatchAgentRequest } from '@/types';
import {
  agentConnectionsOptions,
  useAgentDetailSuspenseQuery,
  useAgentSkillsQuery,
  useUpdateAgentMutation,
} from '@/queries/agents';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { InlineEditField } from '@/components/ui/InlineEdit';
import AgentTypePicker from '@/components/agents/AgentTypePicker';
import DeleteAgentModal from '@/components/agents/DeleteAgentModal';
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

// The type carries its webhook settings with it: switching away from WEBHOOK
// has to clear the URL in the same request, so they are edited as one field.
interface TypeDraft {
  type: AgentType;
  webhookUrl: string;
  webhookAuthHeader: string;
}

export default function AgentGeneralPage() {
  const t = useTranslations('Agents');
  const locale = useLocale();
  const router = useRouter();
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);
  const updateAgent = useUpdateAgentMutation(agentId);

  const [deleting, setDeleting] = useState(false);
  // A freshly rotated key is shown once, here, and handed to the MCP snippet
  // below so the user copies a config that already works.
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  const save = (patch: PatchAgentRequest) => updateAgent.mutateAsync(patch);

  const rotateKey = async () => {
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
    <>
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        {/* Status, and the actions that are not a field of their own. Editing
            lives on the fields themselves now, so nothing here says "edit". */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              agent.enabled ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${agent.enabled ? 'bg-success' : 'bg-muted'}`} />
            {agent.enabled ? t('enabled') : t('disabled')}
          </span>
          <DropdownMenu
            items={[
              {
                label: t('deleteAgentTitle'),
                icon: TrashIcon,
                onClick: () => setDeleting(true),
                danger: true,
              },
            ]}
          />
        </div>

        {/* Description */}
        <InlineEditField
          label={t('description')}
          value={agent.description ?? ''}
          // An emptied field sends "" — that is what clears it; null would
          // read as "leave it alone".
          onSave={(next) => save({ description: next.trim() })}
          defaultError={t('updateError')}
          editor={({ draft, setDraft, disabled, onKeyDown }) => (
            <TextArea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={disabled}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
              maxLength={500}
            />
          )}
        >
          {agent.description ? (
            <p className="text-sm text-foreground">{agent.description}</p>
          ) : (
            <p className="text-sm text-muted">{t('noDescription')}</p>
          )}
        </InlineEditField>

        {/* Prompt */}
        <InlineEditField
          label={t('prompt')}
          value={agent.instructions ?? ''}
          onSave={(next) => save({ instructions: next })}
          defaultError={t('updateError')}
          editor={({ draft, setDraft, disabled, onKeyDown }) => (
            <TextArea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={disabled}
              placeholder={t('promptPlaceholder')}
              rows={10}
              className="font-mono"
            />
          )}
          hint={
            // Stored, but nothing delivers it to an MCP client yet — it only gets
            // tools. Saying so beats a prompt that looks silently ignored.
            isMcpAgent(agent.type) ? (
              <p className="text-xs text-muted mt-1">{t('mcpPromptHint')}</p>
            ) : null
          }
        >
          <div className="bg-surface-secondary rounded-lg border border-border/50 p-4">
            {agent.instructions ? (
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{agent.instructions}</pre>
            ) : (
              <p className="text-sm text-muted">{t('noPrompt')}</p>
            )}
          </div>
        </InlineEditField>

        {/* Agent type, plus the webhook settings it owns */}
        <InlineEditField<TypeDraft>
          label={t('agentType')}
          value={{
            type: agent.type,
            webhookUrl: agent.webhookUrl ?? '',
            // Write-only: the agent reports whether one is set, never its value.
            webhookAuthHeader: '',
          }}
          canSave={(draft) =>
            draft.type !== 'WEBHOOK' || /^https?:\/\/.+/.test(draft.webhookUrl.trim())
          }
          onSave={(draft) =>
            save({
              type: draft.type,
              // Nothing about the webhook goes out when moving off it: the
              // server drops the address and deletes the secret itself.
              ...(draft.type === 'WEBHOOK'
                ? {
                    webhookUrl: draft.webhookUrl.trim(),
                    // Left blank means "keep the one you have" — this screen
                    // offers no way to delete a header, only to replace it.
                    ...(draft.webhookAuthHeader
                      ? { webhookAuthHeader: draft.webhookAuthHeader }
                      : {}),
                  }
                : {}),
            })
          }
          defaultError={t('updateError')}
          editor={({ draft, setDraft, disabled }) => (
            <div className="space-y-4">
              <AgentTypePicker
                value={draft.type}
                // The webhook fields keep their draft while another type is
                // selected: they are neither rendered nor sent then, and a user
                // who toggles back has not lost what they typed.
                onChange={(next) => setDraft({ ...draft, type: next })}
              />
              {draft.type === 'WEBHOOK' && (
                <>
                  <FormField label={t('webhookUrl')} required hint={t('webhookUrlHint')}>
                    <Input
                      value={draft.webhookUrl}
                      onChange={(e) => setDraft({ ...draft, webhookUrl: e.target.value })}
                      disabled={disabled}
                      placeholder={t('webhookUrlPlaceholder')}
                    />
                  </FormField>
                  <FormField label={t('webhookAuthHeader')}>
                    <Input
                      value={draft.webhookAuthHeader}
                      onChange={(e) => setDraft({ ...draft, webhookAuthHeader: e.target.value })}
                      disabled={disabled}
                      placeholder={t('webhookAuthHeaderPlaceholder')}
                    />
                    {agent.hasWebhookAuth && (
                      <p className="text-xs text-muted mt-1">{t('webhookAuthConfigured')}</p>
                    )}
                  </FormField>
                </>
              )}
            </div>
          )}
        >
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
        </InlineEditField>

        {/* Key. Not a field — it is never typed in, only replaced — so it keeps
            a button rather than a pencil, and sits by the other read-only facts
            at the bottom instead of competing with the name for the top row. */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">{t('agentKey')}</h3>
          {rotatedKey ? (
            <SecretKeyReveal
              secret={rotatedKey}
              label={t('agentKey')}
              onDone={() => setRotatedKey(null)}
            />
          ) : (
            <div className="space-y-2">
              {rotateError && <ErrorAlert>{rotateError}</ErrorAlert>}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 bg-surface-secondary border border-border/50 rounded-lg px-3 py-1.5 text-xs text-muted font-mono">
                  <KeyIcon className="h-3 w-3" />
                  {agent.maskedKeyId}
                </span>
                <Button
                  variant="warning"
                  onClick={rotateKey}
                  loading={rotating}
                  disabled={rotating}
                  className="!py-1.5 text-sm"
                >
                  {t('regenerateKey')}
                </Button>
              </div>
              <p className="text-xs text-muted">{t('regenerateKeyDescription')}</p>
            </div>
          )}
        </div>

        {/* Created At */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">{t('createdAt')}</h3>
          <p className="text-sm text-foreground">{formatDate(agent.createdAt, locale)}</p>
        </div>
      </div>

      <UnsatisfiedSkillsNotice agentId={agent.id} />

      {isMcpAgent(agent.type) && <McpConnectCard agentId={agent.id} agentKey={rotatedKey} />}

      {deleting && (
        <DeleteAgentModal
          agent={agent}
          onClose={() => setDeleting(false)}
          onSuccess={() => router.push('/dashboard/agents')}
        />
      )}
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

// Connection details of an MCP agent. The key rotation that used to live here
// moved up to the key section — one agent has one key, and two buttons for it
// on one page is one too many; a key rotated up there still lands in the
// snippet below.
function McpConnectCard({ agentId, agentKey }: { agentId: string; agentKey: string | null }) {
  const t = useTranslations('Agents');
  const { data: connections } = useQuery(agentConnectionsOptions(agentId));

  return (
    <div className="mt-6 bg-surface rounded-xl border border-border p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('mcpConnectTitle')}</h2>
        <p className="text-sm text-muted mt-1">{t('mcpConnectSubtitle')}</p>
      </div>

      <McpConnectPanel agentKey={agentKey} connections={connections} />
    </div>
  );
}
