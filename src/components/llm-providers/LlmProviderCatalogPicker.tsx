'use client';

import { useTranslations } from 'next-intl';
import { ArrowTopRightOnSquareIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { LlmProviderCatalogEntry } from '@/types';
import { ProviderAvatar } from './ProviderAvatar';

interface LlmProviderCatalogPickerProps {
  entries: LlmProviderCatalogEntry[];
  onSelect: (entry: LlmProviderCatalogEntry) => void;
  onManual: () => void;
}

// First step of the add-provider flow: pick a known gateway and get its form
// pre-filled. The catalog is a list of gateways we ship ready-made values for,
// not a list of supported providers — hence the manual entry alongside it.
export function LlmProviderCatalogPicker({ entries, onSelect, onManual }: LlmProviderCatalogPickerProps) {
  const t = useTranslations('LlmProviders');

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('catalogSubtitle')}</p>

      {/* Server-sorted and server-filtered — rendered in the order received. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries.map((entry) => (
          <div
            key={entry.code}
            className="flex flex-col rounded-lg border border-border bg-surface-secondary overflow-hidden focus-within:border-accent hover:border-accent transition-colors"
          >
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="flex items-start gap-3 p-4 text-left flex-1"
            >
              <ProviderAvatar providerType={entry.providerType} />
              <span className="min-w-0">
                <span className="block font-medium text-foreground truncate">{entry.name}</span>
                {entry.description && (
                  <span className="block text-xs text-muted mt-0.5 line-clamp-3">{entry.description}</span>
                )}
              </span>
            </button>

            {/* Outside the button: an anchor inside a button is not valid markup. */}
            {entry.apiKeyUrl && (
              <a
                href={entry.apiKeyUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 px-4 pb-3 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" />
                {t('apiKeyWhereToGet')}
              </a>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={onManual}
          className="flex items-start gap-3 p-4 rounded-lg border border-dashed border-border bg-surface-secondary/40 hover:border-accent hover:bg-surface-secondary/70 transition-colors text-left"
        >
          <span className="h-11 w-11 rounded-xl bg-surface flex items-center justify-center shrink-0 text-muted">
            <WrenchScrewdriverIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-foreground">{t('catalogManual')}</span>
            <span className="block text-xs text-muted mt-0.5">{t('catalogManualHint')}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
