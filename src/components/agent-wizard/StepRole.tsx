'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon } from '@heroicons/react/24/solid';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { AgentPresetResponse } from '@/types';
import { useAgentPresetsQuery } from '@/queries/agent-presets';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getErrorMessage } from '@/utils/error';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { WizardStepProps } from './AgentWizard';

// Card id of the "start from scratch" option (presets use their `code`).
const SCRATCH = 'scratch';

// Lively header bands for preset cards; assigned by gallery position since the
// API carries no visual metadata.
const GRADIENTS = [
  'from-sky-500 to-indigo-500',
  'from-violet-500 to-fuchsia-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-red-500',
];

export default function StepRole({ data, setData, goNext }: WizardStepProps) {
  const t = useTranslations('AgentWizard');
  const { data: presets, isPending, error } = useAgentPresetsQuery();

  // Which card is highlighted. Restored from wizard state when navigating back.
  const [selectedCard, setSelectedCard] = useState<string | null>(
    data.presetCode ?? (data.name || data.instructions ? SCRATCH : null),
  );

  const applyPreset = (preset: AgentPresetResponse) => {
    setSelectedCard(preset.code);
    // Pure prefill — every field below stays editable before creation.
    setData({
      presetCode: preset.code,
      presetConnectorCodes: preset.connectorCodes,
      name: preset.name,
      description: preset.description,
      instructions: preset.instructions,
      skills: preset.skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
      })),
    });
  };

  const applyScratch = () => {
    setSelectedCard(SCRATCH);
    setData({
      presetCode: null,
      presetConnectorCodes: [],
      name: '',
      description: '',
      instructions: '',
      skills: [],
    });
  };

  const formVisible = selectedCard !== null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('roleTitle')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('roleSubtitle')}</p>
      </div>

      {error ? (
        <ErrorAlert>{getErrorMessage(error, t('presetsLoadError'))}</ErrorAlert>
      ) : isPending ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl border border-border bg-surface-secondary animate-pulse" />
          ))}
        </div>
      ) : null}

      {/* Gallery is built strictly from the API response; nothing hardcoded. */}
      {!isPending && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(presets ?? []).map((preset, i) => {
            const selected = selectedCard === preset.code;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`group relative flex flex-col overflow-hidden rounded-xl border bg-surface text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  selected ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent/50'
                }`}
              >
                <div className={`relative h-14 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                  {selected && (
                    <span className="absolute left-3 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-accent shadow">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                {/* Avatar overlapping the band — relative+z-10 so it paints above
                    the positioned gradient header instead of being covered by it */}
                <img
                  src={getAgentAvatarUrl(preset.name)}
                  alt={preset.name}
                  className="relative z-10 -mt-6 ml-4 h-12 w-12 rounded-xl bg-surface shadow-sm ring-4 ring-surface"
                />

                <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
                  <div className="text-sm font-semibold text-foreground">{preset.name}</div>
                  <p className="mt-0.5 line-clamp-3 text-xs text-muted">{preset.description}</p>
                  {preset.connectorCodes.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1 pt-2">
                      {preset.connectorCodes.map((code) => (
                        <span
                          key={code}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Not a preset: empty prefill, same wizard afterwards. */}
          <button
            type="button"
            onClick={applyScratch}
            className={`flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg ${
              selectedCard === SCRATCH
                ? 'border-accent ring-2 ring-accent'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary">
              <PencilSquareIcon className="h-5 w-5 text-muted" />
            </span>
            <span className="text-sm font-semibold text-foreground">{t('scratchTitle')}</span>
            <span className="text-xs text-muted">{t('scratchDesc')}</span>
          </button>
        </div>
      )}

      {formVisible && (
        <div className="space-y-4">
          <FormField label={t('nameLabel')} required>
            <div className="flex items-center gap-3">
              {data.name && (
                <img
                  src={getAgentAvatarUrl(data.name)}
                  alt={data.name}
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                />
              )}
              <Input
                value={data.name}
                onChange={(e) => setData({ name: e.target.value })}
                placeholder={t('namePlaceholder')}
                required
                maxLength={100}
              />
            </div>
          </FormField>

          <FormField label={t('descriptionLabel')}>
            <TextArea
              value={data.description}
              onChange={(e) => setData({ description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
              rows={2}
              maxLength={500}
            />
          </FormField>

          <FormField label={t('instructionsLabel')} hint={t('instructionsHint')}>
            <TextArea
              value={data.instructions}
              onChange={(e) => setData({ instructions: e.target.value })}
              placeholder={t('instructionsPlaceholder')}
              rows={8}
            />
          </FormField>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" onClick={goNext} disabled={!formVisible || !data.name.trim()}>
          {t('next')}
        </Button>
      </div>
    </div>
  );
}
