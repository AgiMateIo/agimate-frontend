'use client';

import { useTranslations } from 'next-intl';
import { CheckIcon } from '@heroicons/react/24/solid';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { AGENT_PRESETS } from './presets';

// Resolved preset values handed back to the form when a card is picked.
export interface PresetSelection {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

interface AgentPresetGalleryProps {
  selectedId: string | null;
  onSelect: (selection: PresetSelection) => void;
}

export default function AgentPresetGallery({ selectedId, onSelect }: AgentPresetGalleryProps) {
  const t = useTranslations('AgentWizard');

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('presetsTitle')}</h3>
        <p className="text-xs text-muted mt-0.5">{t('presetsSubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {AGENT_PRESETS.map((preset) => {
          const name = t(`presets.${preset.i18nKey}.name`);
          const description = t(`presets.${preset.i18nKey}.desc`);
          const selected = selectedId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onSelect({
                  id: preset.id,
                  name,
                  description,
                  instructions: t(`presets.${preset.i18nKey}.instructions`),
                })
              }
              className={`group relative flex flex-col overflow-hidden rounded-xl border bg-surface text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                selected ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent/50'
              }`}
            >
              {/* Gradient header band with emoji accent */}
              <div className={`relative h-14 bg-gradient-to-br ${preset.gradient}`}>
                <span className="absolute right-3 top-2 text-xl drop-shadow-sm">{preset.emoji}</span>
                {selected && (
                  <span className="absolute left-3 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-accent shadow">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              {/* Avatar overlapping the band — relative+z-10 so it paints above
                  the positioned gradient header instead of being covered by it */}
              <img
                src={getAgentAvatarUrl(name)}
                alt={name}
                className="relative z-10 -mt-6 ml-4 h-12 w-12 rounded-xl bg-surface shadow-sm ring-4 ring-surface"
              />

              <div className="px-4 pb-4 pt-2">
                <div className="text-sm font-semibold text-foreground">{name}</div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
