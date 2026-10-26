'use client';

import { useTranslations } from 'next-intl';
import { Chip } from '@/components/ui/Chip';
import { Placeholder } from '@/components/ui/Placeholder';
import { useAdminAgentPresetsQuery } from '@/queries/agent-presets';
import { useTaxonomyLabels } from '@/queries/taxonomy';
import type { AdminAgentPresetResponse, PresetCatalogLocale } from '@/types';

// Every preset of one catalog, disabled ones included, in the server's order.
export default function AdminPresetsList({
  locale,
  onOpen,
}: {
  locale: PresetCatalogLocale;
  onOpen: (preset: AdminAgentPresetResponse) => void;
}) {
  const t = useTranslations('Admin');
  const { data: presets } = useAdminAgentPresetsQuery(locale);
  const { categoryLabel } = useTaxonomyLabels();

  if (presets.length === 0) return <Placeholder>{t('noPresets')}</Placeholder>;

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {presets.map((preset) => (
        <li key={preset.id}>
          <button
            type="button"
            onClick={() => onOpen(preset)}
            className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-secondary sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-medium ${preset.enabled === false ? 'text-muted' : 'text-foreground'}`}>
                  {preset.title}
                </span>
                <span className="font-mono text-xs text-muted">{preset.name}</span>
              </div>
              {preset.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">{preset.description}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {preset.enabled === false && <Chip tone="muted">{t('presetDisabled')}</Chip>}
              {preset.agentType && <Chip>{preset.agentType}</Chip>}
              {preset.category && <Chip tone="muted">{categoryLabel(preset.category)}</Chip>}
              {preset.sortOrder !== undefined && (
                <span className="w-8 text-right text-xs tabular-nums text-muted">{preset.sortOrder}</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
