'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { CategoryRow, TagRows } from '@/components/taxonomy/TaxonomyFilters';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { SkillPickerFilters, SkillPickerSource } from '@/queries/skills';
import { useSkillFacets } from './useSkillFacets';

const SOURCES: SkillPickerSource[] = ['all', 'my', 'public'];

// Everything a skill picker narrows by — source, search, section, tag — and
// the sections and tags on offer. One hook for the Skills page, the wizard
// step and the add-skill modal, so the three cannot drift apart.
export function useSkillCatalogFilters({ onSourceChange }: { onSourceChange?: () => void } = {}) {
  const [source, setSource] = useState<SkillPickerSource>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [category, setCategory] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const facets = useSkillFacets(source);

  // The sections and tags on offer are the source's own, so a choice made
  // under one source has no pill to sit on under the next — it goes with the
  // switch rather than staying in effect unseen.
  const changeSource = (next: SkillPickerSource) => {
    setSource(next);
    setCategory(null);
    setTag(null);
    onSourceChange?.();
  };

  const filters: SkillPickerFilters = { category, tag };
  return {
    source,
    changeSource,
    search,
    setSearch,
    debouncedSearch,
    category,
    setCategory,
    tag,
    setTag,
    facets,
    filters,
    // The funnel glows for what it hides: the source and the tag.
    filtersActive: source !== 'all' || tag !== null,
    // Names the list these filters produce — the key a reveal count or a
    // remount is tied to.
    listKey: `${source}:${debouncedSearch}:${category ?? ''}:${tag ?? ''}`,
  };
}

export type SkillCatalogFilters = ReturnType<typeof useSkillCatalogFilters>;

// The search field with source and tags behind the funnel, and the catalog's
// sections in the open below it.
export function SkillCatalogToolbar({
  state,
  placeholder,
  size,
}: {
  state: SkillCatalogFilters;
  placeholder?: string;
  size?: 'md' | 'sm';
}) {
  const t = useTranslations('Skills');
  return (
    <div className="space-y-3">
      <SearchToolbar
        value={state.search}
        onChange={state.setSearch}
        placeholder={placeholder ?? t('searchPlaceholder')}
        size={size}
        filtersActive={state.filtersActive}
        filters={
          <div className="space-y-2">
            <FilterRow label={t('sourceLabel')}>
              {SOURCES.map((key) => (
                <FilterPill key={key} active={state.source === key} onClick={() => state.changeSource(key)}>
                  {t(`source_${key}`)}
                </FilterPill>
              ))}
            </FilterRow>
            <TagRows tagGroups={state.facets.tagGroups} value={state.tag} onChange={state.setTag} />
          </div>
        }
      />
      <CategoryRow categories={state.facets.categories} value={state.category} onChange={state.setCategory} />
    </div>
  );
}

// How many rows of a grow-in-place list are revealed, tied to the list it was
// counted for: a new `listKey` collapses back to one chunk without an effect.
// Growing in place instead of paging keeps one scroll — the page's.
export function useRevealedRows(listKey: string, chunk: number) {
  const [reveal, setReveal] = useState({ key: listKey, count: chunk });
  const visible = reveal.key === listKey ? reveal.count : chunk;
  return {
    visible,
    revealMore: () => setReveal({ key: listKey, count: visible + chunk }),
  };
}

// The tail of a revealed list: "show N more" while rows are hidden, and once
// they are all out, the note that a scope had more rows than the picker takes.
export function SkillListTail({
  total,
  visible,
  truncated,
  onMore,
}: {
  total: number;
  visible: number;
  truncated: boolean;
  onMore: () => void;
}) {
  const t = useTranslations('Skills');
  if (visible < total) {
    return (
      <button
        type="button"
        onClick={onMore}
        className="w-full rounded-lg border border-dashed border-border py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
      >
        {t('showMore', { count: total - visible })}
      </button>
    );
  }
  if (truncated) {
    return <p className="pt-1 text-center text-xs text-muted">{t('refineSearch')}</p>;
  }
  return null;
}
