'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { CatalogConnectorPresetResponse, TaxonomyResponse } from '@/types';
import { CategoryRow } from '@/components/taxonomy/TaxonomyFilters';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { makeRegionLabel } from '@/utils/region';
import { presentFacets, taxonomyLabelLookup } from '@/utils/taxonomy';
import { ConnectorPresetCard } from './ConnectorPresetCards';
import { CATALOG_AUTH_LABEL, CATALOG_AVAILABILITY_LABEL } from './connectorPresetLabels';

/**
 * The public services list. Like the other catalog lists, it is a client-side
 * cut of what the server rendered: a few dozen cards stay in the HTML a
 * crawler reads, and filtering costs no request.
 */
export function ConnectorCatalogBrowser({
  items,
  taxonomy,
}: {
  items: CatalogConnectorPresetResponse[];
  taxonomy: TaxonomyResponse;
}) {
  const t = useTranslations('CatalogPage');
  const tc = useTranslations('CatalogPage.connector');
  const locale = useLocale();
  const labels = useMemo(() => taxonomyLabelLookup(taxonomy), [taxonomy]);
  const regionLabel = useMemo(() => makeRegionLabel(locale), [locale]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      presentFacets(
        taxonomy,
        items.map((item) => ({ category: item.card.category, tags: [] })),
      ).categories,
    [taxonomy, items],
  );

  const jurisdictions = useMemo(() => {
    const codes = [
      ...new Set(items.map((item) => item.card.jurisdiction).filter((code): code is string => !!code)),
    ];
    return codes.sort((a, b) => regionLabel(a).localeCompare(regionLabel(b), locale));
  }, [items, regionLabel, locale]);

  const query = search.trim().toLowerCase();
  const shown = items.filter((item) => {
    if (category && item.card.category !== category) return false;
    if (jurisdiction && item.card.jurisdiction !== jurisdiction) return false;
    if (!query) return true;
    return [item.card.name, item.card.description ?? '', item.code].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  if (items.length === 0) {
    return <p className="py-16 text-center text-muted">{t('connectorsIndex.empty')}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="mb-8 space-y-3">
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={t('connectorsIndex.searchPlaceholder')}
        />
        <CategoryRow categories={categories} value={category} onChange={setCategory} />
        {jurisdictions.length > 1 && (
          <FilterRow label={t('connectorsIndex.country')}>
            <FilterPill active={jurisdiction === null} onClick={() => setJurisdiction(null)}>
              {t('connectorsIndex.allCountries')}
            </FilterPill>
            {jurisdictions.map((code) => (
              <FilterPill
                key={code}
                active={jurisdiction === code}
                onClick={() => setJurisdiction(jurisdiction === code ? null : code)}
              >
                {regionLabel(code)}
              </FilterPill>
            ))}
          </FilterRow>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="py-12 text-center text-muted">
          <p>{t('noMatches')}</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategory(null);
              setJurisdiction(null);
            }}
            className="mt-3 text-sm font-medium text-accent hover:underline"
          >
            {t('resetFilters')}
          </button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            {t('connectorsIndex.count', { count: shown.length })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((preset) => {
              const availability = preset.connection.availability;
              return (
                <ConnectorPresetCard
                  key={preset.code}
                  preset={preset}
                  categoryLabel={labels.categoryLabel(preset.card.category)}
                  jurisdictionLabel={
                    preset.card.jurisdiction ? regionLabel(preset.card.jurisdiction) : null
                  }
                  authLabel={tc(CATALOG_AUTH_LABEL[preset.card.auth])}
                  availabilityLabel={
                    availability === 'AVAILABLE'
                      ? null
                      : tc(CATALOG_AVAILABILITY_LABEL[availability])
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
