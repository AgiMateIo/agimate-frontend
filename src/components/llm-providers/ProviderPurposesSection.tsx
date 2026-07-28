'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import {
  AgentLlmPurpose,
  LlmProviderModelResponse,
  LlmProviderResponse,
  LlmPurposePriority,
} from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Input, Select } from '@/components/ui/FormField';
import { ModelPickerList } from './ModelPickerList';
import { matchCapabilityFilter } from './modelRegistry';
import {
  PROVIDER_PURPOSES,
  PurposeState,
  purposeLabelKey,
  purposeRequirement,
  purposeRequirementLabelKey,
  purposeState,
} from './llmPurpose';

interface ProviderPurposesSectionProps {
  provider: LlmProviderResponse;
  models: LlmProviderModelResponse[];
  onSaved: (updated: LlmProviderResponse) => void;
}

type Draft = Record<string, { state: PurposeState; models: string[] }>;

const buildDraft = (priority: LlmPurposePriority | null): Draft =>
  Object.fromEntries(
    PROVIDER_PURPOSES.map((purpose) => [
      purpose,
      { state: purposeState(priority, purpose), models: priority?.[purpose] ?? [] },
    ])
  );

// A draft row with no models is saved as "not configured" — an empty list is the
// deliberate off switch and has its own state, so it must not be reachable by
// simply emptying a list.
const draftToPriority = (draft: Draft, current: LlmPurposePriority | null): LlmPurposePriority => {
  // Purposes this editor does not show (audio) still travel back untouched:
  // PATCH replaces the whole map instead of merging it key by key.
  const next: LlmPurposePriority = Object.fromEntries(
    Object.entries(current ?? {}).filter(([purpose]) => !PROVIDER_PURPOSES.includes(purpose as AgentLlmPurpose))
  );
  for (const purpose of PROVIDER_PURPOSES) {
    const row = draft[purpose];
    if (row.state === 'off') next[purpose] = [];
    else if (row.state === 'list' && row.models.length > 0) next[purpose] = row.models;
  }
  return next;
};

const comparable = (priority: LlmPurposePriority | null) =>
  JSON.stringify(Object.entries(priority ?? {}).sort(([a], [b]) => a.localeCompare(b)));

// Provider-level answer to "which model serves this purpose": an ordered
// allow-list per purpose, saved as one map (the backend replaces it wholesale).
export default function ProviderPurposesSection({ provider, models, onSaved }: ProviderPurposesSectionProps) {
  const t = useTranslations('LlmProviders');
  const tc = useTranslations('Common');

  const [draft, setDraft] = useState<Draft>(() => buildDraft(provider.purposePriority));
  const [adding, setAdding] = useState<AgentLlmPurpose | null>(null);
  const [manualModel, setManualModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registryEmpty = models.length === 0;
  const payload = useMemo(() => draftToPriority(draft, provider.purposePriority), [draft, provider.purposePriority]);
  // Key order is not part of the value — the map comes back in whatever order
  // the backend serialized it.
  const dirty = comparable(payload) !== comparable(provider.purposePriority);

  const patchRow = (purpose: AgentLlmPurpose, patch: Partial<Draft[string]>) =>
    setDraft((prev) => ({ ...prev, [purpose]: { ...prev[purpose], ...patch } }));

  const changeState = (purpose: AgentLlmPurpose, state: PurposeState) => {
    patchRow(purpose, { state });
    if (state !== 'list') setAdding((prev) => (prev === purpose ? null : prev));
  };

  const addModel = (purpose: AgentLlmPurpose, model: string) => {
    const value = model.trim();
    if (!value) return;
    setDraft((prev) => {
      const row = prev[purpose];
      if (row.models.includes(value)) return prev;
      return { ...prev, [purpose]: { state: 'list', models: [...row.models, value] } };
    });
    setAdding(null);
    setManualModel('');
  };

  const removeModel = (purpose: AgentLlmPurpose, index: number) =>
    setDraft((prev) => {
      const models = prev[purpose].models.filter((_, i) => i !== index);
      return { ...prev, [purpose]: { state: prev[purpose].state, models } };
    });

  const moveModel = (purpose: AgentLlmPurpose, index: number, delta: number) =>
    setDraft((prev) => {
      const models = [...prev[purpose].models];
      const target = index + delta;
      if (target < 0 || target >= models.length) return prev;
      [models[index], models[target]] = [models[target], models[index]];
      return { ...prev, [purpose]: { ...prev[purpose], models } };
    });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiService.updateLlmProvider(provider.id, { purposePriority: payload });
      // Re-seed from the response: a "custom list" left empty is stored as unset,
      // and the row must say so rather than keep claiming a list.
      setDraft(buildDraft(updated.purposePriority));
      onSaved(updated);
    } catch (err) {
      // The backend's 400s name the offending purpose and model — show them verbatim.
      setError(getErrorMessage(err, t('purposesSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(buildDraft(provider.purposePriority));
    setAdding(null);
    setError(null);
  };

  const registryRow = (model: string) => models.find((m) => m.model === model);

  return (
    <section className="bg-surface rounded-xl border border-border p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('purposesTitle')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('purposesSubtitle')}</p>
      </div>

      {registryEmpty && <Alert variant="warning">{t('purposesRegistryEmpty')}</Alert>}

      <div className="space-y-3">
        {PROVIDER_PURPOSES.map((purpose) => {
          const row = draft[purpose];
          const requirement = purposeRequirement[purpose];
          const offered = models.filter((m) => !row.models.includes(m.model));

          return (
            <div key={purpose} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Chip tone={purpose === 'CHAT' ? 'default' : 'accent'}>{t(purposeLabelKey[purpose])}</Chip>
                  <p className="text-xs text-muted mt-1.5">{t(purposeRequirementLabelKey[purpose])}</p>
                </div>
                <div className="w-56 shrink-0">
                  <Select
                    value={row.state}
                    onChange={(e) => changeState(purpose, e.target.value as PurposeState)}
                    disabled={saving}
                    aria-label={t(purposeLabelKey[purpose])}
                  >
                    <option value="unset">{t('purposeStateUnset')}</option>
                    <option value="list">{t('purposeStateList')}</option>
                    <option value="off">{t('purposeStateOff')}</option>
                  </Select>
                </div>
              </div>

              {row.state === 'unset' && <p className="text-xs text-muted">{t('purposeStateUnsetHint')}</p>}
              {row.state === 'off' && <p className="text-xs text-warning">{t('purposeStateOffHint')}</p>}

              {row.state === 'list' && (
                <div className="space-y-2">
                  {row.models.length === 0 ? (
                    <p className="text-xs text-muted">{t('purposeListEmptyHint')}</p>
                  ) : (
                    <ol className="divide-y divide-border/50 border border-border rounded-lg bg-surface-secondary">
                      {row.models.map((model, index) => {
                        const registered = registryRow(model);
                        const unavailable = registered?.status === 'UNAVAILABLE';
                        // Not in a non-empty registry at all: the provider never listed it.
                        const unlisted = !registered && !registryEmpty;
                        const unfit =
                          !!registered && matchCapabilityFilter(registered, requirement.filter) === 'excluded';

                        return (
                          <li key={model} className="flex items-center gap-2 px-3 py-2">
                            <span className="text-xs text-muted w-4 shrink-0">{index + 1}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-foreground font-mono truncate">{model}</span>
                              {(unavailable || unlisted) && (
                                <span className="flex items-center gap-1 text-xs text-warning mt-0.5">
                                  <ExclamationTriangleIcon className="h-3 w-3 shrink-0" />
                                  {t('purposeModelSkipped')}
                                </span>
                              )}
                              {unfit && (
                                <span className="flex items-center gap-1 text-xs text-warning mt-0.5">
                                  <ExclamationTriangleIcon className="h-3 w-3 shrink-0" />
                                  {t('modelUnfit')}
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveModel(purpose, index, -1)}
                                disabled={saving || index === 0}
                                aria-label={t('purposeMoveUp')}
                                className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30"
                              >
                                <ArrowUpIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveModel(purpose, index, 1)}
                                disabled={saving || index === row.models.length - 1}
                                aria-label={t('purposeMoveDown')}
                                className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30"
                              >
                                <ArrowDownIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeModel(purpose, index)}
                                disabled={saving}
                                aria-label={t('purposeRemoveModel')}
                                className="p-1 rounded-md text-muted hover:text-error hover:bg-error/10 transition-colors"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {adding === purpose ? (
                    <div className="space-y-2">
                      {registryEmpty ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={manualModel}
                            onChange={(e) => setManualModel(e.target.value)}
                            placeholder={t('modelIdPlaceholder')}
                            disabled={saving}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => addModel(purpose, manualModel)}
                            disabled={saving || !manualModel.trim()}
                          >
                            {t('purposeAddModel')}
                          </Button>
                        </div>
                      ) : (
                        <ModelPickerList
                          models={offered}
                          value=""
                          onChange={(model) => addModel(purpose, model)}
                          disabled={saving}
                          requirement={{ ...requirement, label: t(purposeRequirementLabelKey[purpose]) }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setAdding(null)}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        {tc('cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(purpose);
                        setManualModel('');
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                      {t('purposeAddModel')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={saving} disabled={saving || !dirty}>
          {tc('save')}
        </Button>
        <Button variant="secondary" onClick={handleReset} disabled={saving || !dirty}>
          {t('purposesReset')}
        </Button>
      </div>
    </section>
  );
}
