'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { TextArea } from '@/components/ui/FormField';
import { InlineEditField } from '@/components/ui/InlineEdit';
import { RowAction } from '@/components/ui/RowAction';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import {
  StarterListEditor,
  hasDuplicateStarters,
  type StarterRow,
} from '@/components/agents/StarterListEditor';
import { useAgentCacheActions, useAgentStartersQuery } from '@/queries/agents';
import { getErrorMessage } from '@/utils/error';
import { STARTER_LIMITS, type AgentStartersResponse } from '@/types';

interface Draft {
  greeting: string;
  starters: StarterRow[];
}

const toDraft = (data: AgentStartersResponse): Draft => ({
  greeting: data.greeting ?? '',
  starters: data.starters
    .filter((s) => s.id !== null)
    .map((s) => ({ id: s.id!, key: s.id!, text: s.text })),
});

// The greeting and the agent's own starters, edited together because one PUT
// replaces both. The skills' starters are listed beside them read-only: they
// are edited with the skill, and only hidden from the chat itself.
export default function AgentStartersCard({ agentId }: { agentId: string }) {
  const t = useTranslations('Agents');
  const query = useAgentStartersQuery(agentId);
  const { setAgentStarters, invalidateAgentStarters } = useAgentCacheActions();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restored, setRestored] = useState(false);

  const value = useMemo(() => (query.data ? toDraft(query.data) : null), [query.data]);
  const skillStarters = query.data?.starters.filter((s) => s.agentSkillId !== null) ?? [];

  const handleRestore = async () => {
    setRestoring(true);
    setRestoreError('');
    try {
      await apiService.restoreAgentStarters(agentId);
      setRestored(true);
      await invalidateAgentStarters(agentId);
    } catch (err) {
      setRestoreError(getErrorMessage(err, t('startersRestoreFailed')));
    } finally {
      setRestoring(false);
    }
  };

  if (query.isPending) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6">
        <Placeholder size="sm">{t('startersLoading')}</Placeholder>
      </div>
    );
  }
  if (query.error || !value) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6">
        <ErrorAlert>{getErrorMessage(query.error, t('startersLoadFailed'))}</ErrorAlert>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t('startersTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('startersSubtitle')}</p>
      </div>

      <InlineEditField<Draft>
        label={t('startersOwnLabel')}
        value={value}
        defaultError={t('startersSaveFailed')}
        canSave={(draft) => !hasDuplicateStarters(draft.starters)}
        onSave={async (draft) => {
          const updated = await apiService.updateAgentStarters(agentId, {
            greeting: draft.greeting.trim() || null,
            starters: draft.starters
              .map((s) => ({ ...(s.id && { id: s.id }), text: s.text.trim() }))
              .filter((s) => s.text),
          });
          setAgentStarters(agentId, updated);
        }}
        editor={({ draft, setDraft, disabled, onKeyDown }) => (
          <div className="space-y-4" onKeyDown={onKeyDown}>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t('greetingLabel')}
              </label>
              <TextArea
                autoFocus
                value={draft.greeting}
                onChange={(e) => setDraft({ ...draft, greeting: e.target.value })}
                disabled={disabled}
                maxLength={STARTER_LIMITS.greetingLength}
                rows={3}
                placeholder={t('greetingPlaceholder')}
              />
              <p className="mt-1 text-xs text-muted">
                {draft.greeting.length}/{STARTER_LIMITS.greetingLength}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t('startersLabel')}
              </label>
              <StarterListEditor
                rows={draft.starters}
                onChange={(starters) => setDraft({ ...draft, starters })}
                disabled={disabled}
              />
            </div>
          </div>
        )}
      >
        <div className="space-y-3">
          {value.greeting ? (
            <p className="whitespace-pre-wrap text-sm text-foreground">{value.greeting}</p>
          ) : (
            <p className="text-sm text-muted">{t('noGreeting')}</p>
          )}
          {value.starters.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {value.starters.map((s) => (
                <li
                  key={s.key}
                  className="rounded-lg border border-border bg-surface-secondary px-2.5 py-1 text-sm text-foreground"
                >
                  {s.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t('noOwnStarters')}</p>
          )}
        </div>
      </InlineEditField>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-muted">{t('startersSkillLabel')}</h3>
          {/* Nothing says how many are hidden, so the way back is always offered. */}
          <RowAction
            icon={ArrowPathIcon}
            label={t('startersRestore')}
            onClick={handleRestore}
            disabled={restoring}
            spinning={restoring}
          />
        </div>
        {restoreError && <ErrorAlert>{restoreError}</ErrorAlert>}
        {restored && !restoreError && (
          <p className="mb-2 text-xs text-muted">{t('startersRestored')}</p>
        )}
        {skillStarters.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {skillStarters.map((s) => (
              <li
                key={`${s.agentSkillId}:${s.text}`}
                className="rounded-lg border border-border px-2.5 py-1 text-sm text-foreground"
              >
                {s.text}
                {s.skillTitle && <span className="ml-1.5 text-xs text-muted">· {s.skillTitle}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t('noSkillStarters')}</p>
        )}
        <p className="mt-2 text-xs text-muted">{t('startersSkillHint')}</p>
      </div>
    </div>
  );
}
