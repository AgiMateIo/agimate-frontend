'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import apiService, { ApiError } from '@/services/api';
import {
  AgentLlmBindingRequest,
  AgentLlmPurpose,
  LlmProviderResponse,
  PlatformLlmEntryResponse,
} from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { FormField, Select } from '@/components/ui/FormField';
import { useLlmProviderCacheActions } from '@/queries/llm-providers';
import { ModelField } from '@/components/llm-providers/ModelField';
import {
  MAX_PURPOSE_CHAIN,
  isTextPurpose,
  purposeLabelKey,
  purposeRequirement,
  purposeRequirementLabelKey,
} from '@/components/llm-providers/llmPurpose';

interface PlatformPurposeCardProps {
  purpose: AgentLlmPurpose;
  // The purpose's chain as served, in priority order.
  entries: PlatformLlmEntryResponse[];
  // Platform providers only — the backend refuses any other kind here.
  providers: LlmProviderResponse[];
}

const toPair = (entry: PlatformLlmEntryResponse): AgentLlmBindingRequest => ({
  llmProviderId: entry.llmProviderId,
  model: entry.model,
});

const sameChain = (a: AgentLlmBindingRequest[], b: AgentLlmBindingRequest[]) =>
  JSON.stringify(a) === JSON.stringify(b);

// One platform purpose as a draftable ordered chain. The server assigns
// `priority` from the array index, so the draft order IS the priority; nothing
// is sent until Save, which replaces the whole chain. Clearing is its own
// DELETE (and answers 404 when the purpose was already empty).
export default function PlatformPurposeCard({ purpose, entries, providers }: PlatformPurposeCardProps) {
  const t = useTranslations('LlmProviders');
  const tc = useTranslations('Common');
  const { setPlatformPurpose } = useLlmProviderCacheActions();

  const seed = useMemo(() => entries.map(toPair), [entries]);
  const [draft, setDraft] = useState<AgentLlmBindingRequest[]>(seed);
  const [adding, setAdding] = useState(false);
  const [addProviderId, setAddProviderId] = useState(providers[0]?.id ?? '');
  const [addModel, setAddModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = !sameChain(draft, seed);
  const full = draft.length >= MAX_PURPOSE_CHAIN;
  const providerName = (id: string) =>
    providers.find((p) => p.id === id)?.name ?? id;

  const value = addModel.trim();
  const duplicate =
    !!value && draft.some((b) => b.llmProviderId === addProviderId && b.model === value);
  const canAdd = drawable() && !full && !duplicate;

  function drawable() {
    return !!addProviderId && !!value;
  }

  const handleAdd = () => {
    if (!canAdd) return;
    setDraft((prev) => [...prev, { llmProviderId: addProviderId, model: value }]);
    setAddModel('');
    setAdding(false);
    setError(null);
  };

  const removeLink = (index: number) =>
    setDraft((prev) => prev.filter((_, i) => i !== index));

  const moveLink = (index: number, delta: number) =>
    setDraft((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiService.updatePlatformLlms(purpose, { bindings: draft });
      setDraft(saved.map(toPair));
      setPlatformPurpose(purpose, saved);
    } catch (err) {
      // 400 names the bad link; 409 means another writer got there first and
      // asks for a retry — show both verbatim.
      setError(getErrorMessage(err, t('platformPurposeSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(seed);
    setAdding(false);
    setError(null);
  };

  const requirement = {
    ...purposeRequirement[purpose],
    label: t(purposeRequirementLabelKey[purpose]),
  };

  return (
    <section className="border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip tone={isTextPurpose(purpose) ? 'default' : 'accent'}>
              {t(purposeLabelKey[purpose])}
            </Chip>
            <span className="text-xs text-muted">
              {t('platformPurposeCount', { count: draft.length, max: MAX_PURPOSE_CHAIN })}
            </span>
          </div>
          <p className="text-xs text-muted mt-1.5">{t(purposeRequirementLabelKey[purpose])}</p>
        </div>
        {dirty && <Chip tone="warning">{t('platformPurposeUnsaved')}</Chip>}
      </div>

      {draft.length === 0 ? (
        <p className="text-sm text-muted">{t('platformPurposeEmpty')}</p>
      ) : (
        <ol className="divide-y divide-border/50 border border-border rounded-lg bg-surface-secondary">
          {draft.map((binding, index) => (
            <li key={`${binding.llmProviderId}:${binding.model}`} className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs text-muted w-4 shrink-0">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground font-mono">{binding.model}</span>
                <span className="block truncate text-xs text-muted">{providerName(binding.llmProviderId)}</span>
              </span>
              <span className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveLink(index, -1)}
                  disabled={saving || index === 0}
                  aria-label={t('purposeMoveUp')}
                  className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveLink(index, 1)}
                  disabled={saving || index === draft.length - 1}
                  aria-label={t('purposeMoveDown')}
                  className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30"
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  disabled={saving}
                  aria-label={t('purposeRemoveModel')}
                  className="p-1 rounded-md text-muted hover:text-error hover:bg-error/10 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {adding ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface-secondary p-3">
          <div className="grid gap-3 md:grid-cols-3 md:items-start">
            <FormField label={t('provider')} required>
              <Select
                value={addProviderId}
                onChange={(e) => {
                  setAddProviderId(e.target.value);
                  setAddModel('');
                }}
                disabled={saving}
                required
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} {!provider.enabled ? `(${t('disabled')})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="md:col-span-2">
              <FormField label={t('modelLabel')} required hint={requirement.label}>
                <ModelField
                  providerId={addProviderId}
                  value={addModel}
                  onChange={setAddModel}
                  disabled={saving}
                  // Re-key on provider change so search/filter state starts clean.
                  pickerKey={addProviderId}
                  requirement={requirement}
                  onError={setError}
                />
              </FormField>
            </div>
          </div>

          {duplicate && <ErrorAlert>{t('platformPurposeDuplicate')}</ErrorAlert>}

          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={!canAdd}>
              {t('platformPurposeAdd')}
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={saving}>
              {tc('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setAddModel('');
            }}
            disabled={saving || full}
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-4 w-4" />
            {t('platformPurposeAdd')}
          </button>
          {full && (
            <span className="text-xs text-muted">
              {t('platformPurposeLimit', { max: MAX_PURPOSE_CHAIN })}
            </span>
          )}
        </div>
      )}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} loading={saving} disabled={saving || clearing || !dirty}>
          {tc('save')}
        </Button>
        <Button variant="secondary" onClick={handleReset} disabled={saving || clearing || !dirty}>
          {t('purposesReset')}
        </Button>
        {draft.length > 0 && (
          <Button variant="danger" onClick={() => setClearing(true)} disabled={saving || clearing}>
            {t('platformPurposeClear')}
          </Button>
        )}
      </div>

      {clearing && (
        <ConfirmDeleteModal
          title={t('platformPurposeClear')}
          confirmLabel={t('platformPurposeClear')}
          cancelLabel={tc('cancel')}
          defaultError={t('platformPurposeSaveFailed')}
          onConfirm={async () => {
            try {
              await apiService.deletePlatformLlms(purpose);
            } catch (err) {
              // Already empty (someone else cleared it) — the outcome is what
              // was asked for, so re-read instead of reporting a failure.
              if (err instanceof ApiError && err.status === 404) return;
              throw err;
            }
          }}
          onClose={() => setClearing(false)}
          onSuccess={() => {
            setDraft([]);
            setClearing(false);
            setError(null);
            setPlatformPurpose(purpose, []);
          }}
        >
          <Alert variant="warning">{t('platformPurposeClearWarning')}</Alert>
        </ConfirmDeleteModal>
      )}
    </section>
  );
}
