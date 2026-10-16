'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CategoryRow, TagRows } from '@/components/taxonomy/TaxonomyFilters';
import { PresetCard, SkillCard } from '@/components/catalog/CatalogCards';
import { catalogCategory, catalogTags, presentFacets, taxonomyLabelLookup } from '@/utils/taxonomy';
import type { CatalogPresetResponse, CatalogSkillResponse, TaxonomyResponse } from '@/types';

type BrowserProps = { taxonomy: TaxonomyResponse } & (
  | { kind: 'agents'; items: CatalogPresetResponse[] }
  | { kind: 'skills'; items: CatalogSkillResponse[] }
);

// One catalog list is a few dozen rows, already on the page — filtering is a
// client-side cut of what the server rendered, so every item stays in the HTML
// a crawler reads.
export function CatalogBrowser(props: BrowserProps) {
  const { kind, items, taxonomy } = props;
  const t = useTranslations('CatalogPage');
  const [category, setCategory] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const labels = useMemo(() => taxonomyLabelLookup(taxonomy), [taxonomy]);
  const facets = useMemo(() => presentFacets(taxonomy, items), [taxonomy, items]);

  const matches = (item: { category?: string | null; tags?: string[] | null }) =>
    (!category || catalogCategory(item) === category) && (!tag || catalogTags(item).includes(tag));
  const shown = props.kind === 'agents' ? props.items.filter(matches) : props.items.filter(matches);

  if (items.length === 0) {
    return <p className="py-16 text-center text-muted">{t('empty')}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="mb-8 space-y-3">
        <CategoryRow categories={facets.categories} value={category} onChange={setCategory} />
        <TagRows tagGroups={facets.tagGroups} value={tag} onChange={setTag} />
      </div>

      {shown.length === 0 ? (
        <div className="py-12 text-center text-muted">
          <p>{t('noMatches')}</p>
          <button
            type="button"
            onClick={() => {
              setCategory(null);
              setTag(null);
            }}
            className="mt-3 text-sm font-medium text-accent hover:underline"
          >
            {t('resetFilters')}
          </button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            {kind === 'agents' ? t('agentsCount', { count: shown.length }) : t('skillsCount', { count: shown.length })}
          </p>
          <div className={`grid sm:grid-cols-2 lg:grid-cols-3 ${kind === 'agents' ? 'gap-6' : 'gap-4'}`}>
            {props.kind === 'agents'
              ? props.items.filter(matches).map((p) => (
                  <PresetCard
                    key={p.name}
                    name={p.name}
                    title={p.title}
                    description={p.description}
                    category={catalogCategory(p)}
                    tags={catalogTags(p)}
                    connectors={p.connectors}
                    labels={labels}
                  />
                ))
              : props.items.filter(matches).map((s) => (
                  <SkillCard
                    key={s.name}
                    name={s.name}
                    title={s.title}
                    description={s.description}
                    connectors={s.connectors}
                  />
                ))}
          </div>
        </>
      )}
    </div>
  );
}
