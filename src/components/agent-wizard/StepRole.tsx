'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { AgentPresetResponse } from '@/types';
import { useAgentPresetsQuery } from '@/queries/agent-presets';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { getErrorMessage } from '@/utils/error';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { WizardStepProps } from './AgentWizard';
import WizardActions from './WizardActions';

// Card id of the "start from scratch" option (presets use their `name`).
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
    data.presetName ?? (data.name || data.instructions ? SCRATCH : null),
  );

  // The system prompt is the tallest field on the step and, coming from a preset,
  // is read far more often than edited — it collapses to a two-line preview.
  // An empty one opens, since a from-scratch agent has nothing to preview.
  const [instructionsOpen, setInstructionsOpen] = useState(!data.instructions.trim());

  const applyPreset = (preset: AgentPresetResponse) => {
    setSelectedCard(preset.name);
    setInstructionsOpen(false);
    // Pure prefill — every field below stays editable before creation.
    setData({
      presetName: preset.name,
      presetConnectorCodes: preset.connectorCodes,
      // Decides which wizard follows this step; null keeps the regular one.
      agentType: preset.agentType,
      webhookUrl: '',
      connections: [],
      failedConnections: [],
      failedSkills: [],
      name: preset.title,
      description: preset.description,
      instructions: preset.instructions,
      // Preset skills carry no connector codes, so they cannot be given an
      // instance here — they ride along inside the create call as before.
      skills: preset.skills.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        fromPreset: true,
      })),
      skillConnections: {},
    });
  };

  const applyScratch = () => {
    setSelectedCard(SCRATCH);
    setInstructionsOpen(true);
    setData({
      presetName: null,
      presetConnectorCodes: [],
      agentType: null,
      webhookUrl: '',
      connections: [],
      failedConnections: [],
      failedSkills: [],
      name: '',
      description: '',
      instructions: '',
      skills: [],
      skillConnections: {},
    });
  };

  const formVisible = selectedCard !== null;
  // The external-AI branch asks for a name and nothing else here: its prompt is
  // the preset's, sent as-is, and there is no model to pick.
  const external = data.agentType !== null;

  return (
    <div>
      <div className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('roleTitle')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('roleSubtitle')}</p>
        </div>

        {error ? (
          <ErrorAlert>{getErrorMessage(error, t('presetsLoadError'))}</ErrorAlert>
        ) : isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 rounded-xl border border-border bg-surface-secondary animate-pulse" />
            ))}
          </div>
        ) : null}

        {/* Gallery is built strictly from the API response; nothing hardcoded. */}
        {!isPending && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(presets ?? []).map((preset, i) => {
              const selected = selectedCard === preset.name;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border bg-surface text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    selected ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent/50'
                  }`}
                >
                  {/* Avatar and title share the band in one row: no overlap to
                      collide, and no dead space left over. */}
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                    <span className="relative shrink-0">
                      <img
                        src={getAgentAvatarUrl(preset.title)}
                        alt=""
                        className="h-12 w-12 rounded-xl bg-surface shadow-sm ring-2 ring-white/40"
                      />
                      {/* Pinned to the avatar corner so it never steals width from
                          the title, which is the scarce resource on a narrow card. */}
                      {selected && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-accent shadow">
                          <CheckIcon className="h-3 w-3" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 line-clamp-2 text-sm font-semibold leading-tight text-white drop-shadow-sm">
                      {preset.title}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                    <p className="line-clamp-2 text-xs text-muted">{preset.description}</p>
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
              className={`flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg ${
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

            {/* An MCP client gets tools only — no instructions and no skills
                reach it yet. The preset's prompt is still saved, so it starts
                working the day prompts ship, without recreating the agent. */}
            {external && <p className="text-xs text-muted">{t('externalInstructionsNote')}</p>}

            {/* Hand-rolled instead of <FormField>: the label row doubles as the
                disclosure control (same pattern as the agent key on the last step). */}
            {!external && (instructionsOpen ? (
              <div>
                <button
                  type="button"
                  onClick={() => setInstructionsOpen(false)}
                  aria-expanded
                  className="mb-2 flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-sm font-medium text-foreground">
                    {t('instructionsLabel')}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 shrink-0 rotate-180 text-muted" />
                </button>
                <TextArea
                  value={data.instructions}
                  onChange={(e) => setData({ instructions: e.target.value })}
                  placeholder={t('instructionsPlaceholder')}
                  rows={8}
                />
                <p className="text-xs text-muted mt-1">{t('instructionsHint')}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInstructionsOpen(true)}
                aria-expanded={false}
                className="block w-full text-left"
              >
                <span className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {t('instructionsLabel')}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted" />
                </span>
                <span className="block rounded-lg border border-border bg-surface-secondary px-4 py-2.5">
                  <span className="line-clamp-2 whitespace-pre-line text-sm text-muted">
                    {data.instructions.trim() || t('instructionsEmpty')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <WizardActions>
        <Button type="button" onClick={goNext} disabled={!formVisible || !data.name.trim()}>
          {t('next')}
        </Button>
      </WizardActions>
    </div>
  );
}
