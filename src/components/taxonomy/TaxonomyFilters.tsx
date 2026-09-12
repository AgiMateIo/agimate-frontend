'use client';

import { useTranslations } from 'next-intl';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import type { TaxonomyEntry, TaxonomyTagGroup } from '@/types';

// The catalog sections as one row of pills, "all" first. The category is the
// navigation axis of a catalog, so this row sits in the open — the tag rows
// below are what goes behind the funnel. Pass only the sections that have
// items (`presentFacets`): an empty section is not shown, and a catalog with
// one section has nothing to navigate — the row stays out.
export function CategoryRow({
  categories,
  value,
  onChange,
}: {
  categories: TaxonomyEntry[];
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  const t = useTranslations('Taxonomy');
  if (categories.length <= 1) return null;
  return (
    <div role="group" aria-label={t('categories')} className="flex flex-wrap items-center gap-1.5">
      <FilterPill active={value === null} onClick={() => onChange(null)}>
        {t('allCategories')}
      </FilterPill>
      {categories.map((c) => (
        <FilterPill key={c.code} active={value === c.code} onClick={() => onChange(c.code)}>
          {c.label}
        </FilterPill>
      ))}
    </div>
  );
}

// One labelled row per tag group; a single tag at a time, because the skills
// endpoint takes one, and the preset gallery keeps the same rule so the two
// catalogs read alike. Clicking the active tag clears it.
export function TagRows({
  tagGroups,
  value,
  onChange,
}: {
  tagGroups: TaxonomyTagGroup[];
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  return (
    <>
      {tagGroups.map((group) => (
        <FilterRow key={group.code} label={group.label}>
          {group.tags.map((tag) => (
            <FilterPill
              key={tag.code}
              active={value === tag.code}
              onClick={() => onChange(value === tag.code ? null : tag.code)}
            >
              {tag.label}
            </FilterPill>
          ))}
        </FilterRow>
      ))}
    </>
  );
}
