'use client';

import { useTranslations } from 'next-intl';
import type {
  ConnectionResponse,
  ConnectorCatalogEntry,
  ConnectorPresetResponse,
} from '@/types';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Placeholder } from '@/components/ui/Placeholder';
import { useConnectorPresetsQuery } from '@/queries/connectorPresets';
import { ConnectionAvatar } from './ConnectionAvatar';
import PresetCatalog from './PresetCatalog';

export type ConnectorChoice =
  | { kind: 'connector'; connector: ConnectorCatalogEntry }
  | { kind: 'preset'; preset: ConnectorPresetResponse };

export interface PickerFilters {
  tab: 'presets' | 'manual';
  search: string;
  category: string;
  jurisdiction: string;
}

interface ConnectionPickerProps {
  platforms: ConnectorCatalogEntry[];
  connections: ConnectionResponse[];
  connectorCode?: string;
  filters: PickerFilters;
  onFiltersChange: (patch: Partial<PickerFilters>) => void;
  onSelect: (choice: ConnectorChoice) => void;
  onBack?: () => void;
}

// "Ready-made" is the first face of the picker: a service the user recognises
// is easier to choose than an address to type. The manual tab keeps the
// connector tiles — and the MCP one — for everything the catalogue does not
// carry. Chrome-free: the caller owns the modal and the step after this one.
export default function ConnectionPicker({
  platforms,
  connections,
  connectorCode,
  filters,
  onFiltersChange,
  onSelect,
  onBack,
}: ConnectionPickerProps) {
  const t = useTranslations('Connections');
  const tPresets = useTranslations('ConnectorPresets');
  const tCommon = useTranslations('Common');
  const presets = useConnectorPresetsQuery();

  // A deep link names one connector; both tabs narrow to it.
  const scopedPresets = connectorCode
    ? (presets.data ?? []).filter((p) => p.connectorCode === connectorCode)
    : (presets.data ?? []);

  const connectors = platforms.filter(
    (platform) => platform.integrationMeta && (!connectorCode || platform.code === connectorCode),
  );

  return (
    <div className="space-y-4">
      <Tabs
        activeTab={filters.tab}
        onTabChange={(id) => onFiltersChange({ tab: id as PickerFilters['tab'] })}
        tabs={[
          {
            id: 'presets',
            label: t('tabPresets'),
            content: presets.isPending ? (
              <Placeholder size="sm">{tPresets('loading')}</Placeholder>
            ) : presets.isError ? (
              <div className="space-y-3">
                <ErrorAlert>{tPresets('loadError')}</ErrorAlert>
                <Button
                  variant="outline"
                  loading={presets.isFetching}
                  onClick={() => presets.refetch()}
                >
                  {tPresets('retry')}
                </Button>
              </div>
            ) : scopedPresets.length === 0 ? (
              <div className="space-y-3">
                <Placeholder size="sm">{tPresets('empty')}</Placeholder>
                <Button
                  variant="secondary"
                  onClick={() => onFiltersChange({ tab: 'manual' })}
                >
                  {t('tabManual')}
                </Button>
              </div>
            ) : (
              <PresetCatalog
                presets={scopedPresets}
                connections={connections}
                search={filters.search}
                onSearchChange={(value) => onFiltersChange({ search: value })}
                category={filters.category}
                onCategoryChange={(value) => onFiltersChange({ category: value })}
                jurisdiction={filters.jurisdiction}
                onJurisdictionChange={(value) => onFiltersChange({ jurisdiction: value })}
                onSelect={(preset) => onSelect({ kind: 'preset', preset })}
              />
            ),
          },
          {
            id: 'manual',
            label: t('tabManual'),
            content:
              connectors.length === 0 ? (
                <Placeholder size="sm">{t('noConnectorTiles')}</Placeholder>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {connectors.map((platform) => (
                    <button
                      key={platform.code}
                      onClick={() => onSelect({ kind: 'connector', connector: platform })}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface-secondary p-4 text-left transition-colors hover:border-accent hover:bg-surface-secondary/80"
                    >
                      <ConnectionAvatar
                        connectorCode={platform.code}
                        connectorName={platform.name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{platform.name}</div>
                        {platform.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                            {platform.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ),
          },
        ]}
      />

      {onBack && (
        <Button variant="secondary" onClick={onBack}>
          {tCommon('back')}
        </Button>
      )}
    </div>
  );
}
