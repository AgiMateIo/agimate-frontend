'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAgentDetailSuspenseQuery, useUpdateAgentMutation } from '@/queries/agents';
import { TextArea } from '@/components/ui/FormField';
import { InlineEditField } from '@/components/ui/InlineEdit';
import { isMcpAgent } from '@/utils/agent';

// The agent's instructions, on a section of their own: a prompt is the one
// field that grows to a screen, and it used to push the facts of the general
// page (type, key, created) below the fold.
export default function AgentPromptPage() {
  const t = useTranslations('Agents');
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);
  const updateAgent = useUpdateAgentMutation(agentId);

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <InlineEditField
        label={t('prompt')}
        value={agent.instructions ?? ''}
        onSave={(next) => updateAgent.mutateAsync({ instructions: next })}
        defaultError={t('updateError')}
        editor={({ draft, setDraft, disabled, onKeyDown }) => (
          <TextArea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={t('promptPlaceholder')}
            rows={16}
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
    </div>
  );
}
