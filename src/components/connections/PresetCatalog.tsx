'use client';

import { useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type {
  ConnectionResponse,
  ConnectorPresetAuth,
  ConnectorPresetResponse,
} from '@/types';
import { Chip } from '@/components/ui/Chip';
import { Placeholder } from '@/components/ui/Placeholder';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { Select } from '@/components/ui/FormField';
import { useTaxonomyLabels } from '@/queries/taxonomy';
import { ConnectionAvatar } from './ConnectionAvatar';
import { PRESET_AUTH_LABEL, PRESET_AVAILABILITY_LABEL } from './presetLabels';

const AUTH_TONE: Record<ConnectorPresetAuth, 'accent' | 'default' | 'muted'> = {
  OAUTH: 'accent',
  TOKEN: 'default',
  NONE: 'muted',
  UNKNOWN: 'muted',
};

// Identity of an existing instance, compared byte for byte with a preset's
// `connection.identity`. The connector code is part of the key: two connector
// types could name the same subCode.
const connectionKey = (connectorCode: string, subCode: string) =>
  `${connectorCode}\u0000${subCode}`;

function makeRegionName(locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    return null;
  }
}

interface PresetCatalogProps {
  presets: ConnectorPresetResponse[];
  connections: ConnectionResponse[];
  // Held by the picker, not here: switching tabs or opening a form unmounts
  // this component, and a returning user should find their search intact.
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  jurisdiction: string;
  onJurisdictionChange: (value: string) => void;
  onSelect: (preset: ConnectorPresetResponse) => void;
}

/**
 * The "ready-made" tab of the connector picker: the whole catalogue arrives in
 * one request and is cut here — a few dozen rows do not justify a request per
 * keystroke, and the facets stay stable while a filter is applied.
 */
export default function PresetCatalog({
  presets,
  connections,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  jurisdiction,
  onJurisdictionChange,
  onSelect,
}: PresetCatalogProps) {
  const t = useTranslations('ConnectorPresets');
  const locale = useLocale();
  const { taxonomy, categoryLabel } = useTaxonomyLabels();

  const regionNames = useMemo(() => makeRegionName(locale), [locale]);
  const regionLabel = useCallback(
    (code: string) => regionNames?.of(code) ?? code,
    [regionNames],
  );

  const connected = useMemo(
    () =>
      new Set(
        connections.flatMap((c) =>
          c.subCode ? [connectionKey(c.connectorCode, c.subCode)] : [],
        ),
      ),
    [connections],
  );

  // Facets come from the full catalogue, in the taxonomy's display order.
  const categories = useMemo(() => {
    const codes = new Set(presets.map((p) => p.card.category));
    const order = new Map((taxonomy?.categories ?? []).map((c, index) => [c.code, index]));
    return [...codes].sort(
      (a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [presets, taxonomy]);

  const jurisdictions = useMemo(() => {
    const codes = [
      ...new Set(presets.map((p) => p.card.jurisdiction).filter((c): c is string => !!c)),
    ];
    return codes.sort((a, b) => regionLabel(a).localeCompare(regionLabel(b), locale));
  }, [presets, regionLabel, locale]);

  const query = search.trim().toLowerCase();
  const filtered = presets.filter((preset) => {
    if (category && preset.card.category !== category) return false;
    if (jurisdiction && preset.card.jurisdiction !== jurisdiction) return false;
    if (!query) return true;
    return [preset.card.name, preset.card.description ?? '', preset.code].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  if (presets.length === 0) {
    return <Placeholder size="sm">{t('empty')}</Placeholder>;
  }

  return (
    <div className="space-y-4">
      <SearchToolbar
        size="sm"
        value={search}
        onChange={onSearchChange}
        placeholder={t('searchPlaceholder')}
        filtersActive={!!category || !!jurisdiction}
        filters={
          <div className="grid grid-cols-2 gap-2">
            <Select
              size="sm"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label={t('categoryFilter')}
            >
              <option value="">{t('allCategories')}</option>
              {categories.map((code) => (
                <option key={code} value={code}>
                  {categoryLabel(code)}
                </option>
              ))}
            </Select>
            <Select
              size="sm"
              value={jurisdiction}
              onChange={(e) => onJurisdictionChange(e.target.value)}
              aria-label={t('jurisdictionFilter')}
            >
              <option value="">{t('allJurisdictions')}</option>
              {jurisdictions.map((code) => (
                <option key={code} value={code}>
                  {regionLabel(code)}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <Placeholder size="sm">{t('noMatches')}</Placeholder>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((preset) => (
            <PresetTile
              key={preset.code}
              preset={preset}
              connected={connected.has(
                connectionKey(preset.connectorCode, preset.connection.identity),
              )}
              categoryLabel={categoryLabel(preset.card.category)}
              jurisdictionLabel={
                preset.card.jurisdiction ? regionLabel(preset.card.jurisdiction) : null
              }
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PresetTile({
  preset,
  connected,
  categoryLabel,
  jurisdictionLabel,
  onSelect,
}: {
  preset: ConnectorPresetResponse;
  connected: boolean;
  categoryLabel: string;
  jurisdictionLabel: string | null;
  onSelect: (preset: ConnectorPresetResponse) => void;
}) {
  const t = useTranslations('ConnectorPresets');
  const { availability } = preset.connection;
  // An empty method list means there is nothing the form could offer, even if
  // the availability hint says the server itself is reachable.
  const unavailableReason =
    availability !== 'AVAILABLE'
      ? t(PRESET_AVAILABILITY_LABEL[availability])
      : preset.form.authMethods.length === 0
        ? t('availabilityAuthUnsupported')
        : null;
  const available = unavailableReason === null;

  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => onSelect(preset)}
      title={unavailableReason ?? undefined}
      className="flex items-start gap-3 rounded-lg border border-border bg-surface-secondary p-4 text-left transition-colors enabled:hover:border-accent enabled:hover:bg-surface-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ConnectionAvatar
        connectorCode={preset.code}
        connectorName={preset.card.name}
        iconUrl={preset.card.iconUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-foreground">{preset.card.name}</span>
          {connected && <Chip tone="success">{t('connected')}</Chip>}
        </div>
        {preset.card.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{preset.card.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          <Chip tone={AUTH_TONE[preset.card.auth]}>{t(PRESET_AUTH_LABEL[preset.card.auth])}</Chip>
          <Chip tone="muted">{categoryLabel}</Chip>
          {jurisdictionLabel && <Chip>{jurisdictionLabel}</Chip>}
        </div>
        {unavailableReason && (
          <p className="mt-2 text-xs text-warning">{unavailableReason}</p>
        )}
      </div>
    </button>
  );
}
