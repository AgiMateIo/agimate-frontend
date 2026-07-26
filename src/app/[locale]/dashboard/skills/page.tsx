'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useSkillPickerSuspenseQuery,
  useSkillsCacheActions,
  type SkillPickerSource,
} from '@/queries/skills';
import { Link } from '@/i18n/navigation';
import SkillsList from '@/components/skills/SkillsList';

// Rows revealed at once; "show more" grows the list in place. Both scopes are
// merged client-side, so there is no server page to walk (see the query module).
const CHUNK = 12;

const SOURCES: SkillPickerSource[] = ['all', 'my', 'public'];

const EMPTY_KEY = {
  all: 'noSkillsFound',
  my: 'noSkills',
  public: 'noPublicSkills',
} as const;

function SkillsContent({
  source,
  search,
}: {
  source: SkillPickerSource;
  search: string;
}) {
  const t = useTranslations('Skills');
  const { skills, truncated } = useSkillPickerSuspenseQuery(source, search);
  const { removeSkillFromLists } = useSkillsCacheActions();
  // Remounted by the caller's key whenever the source or search changes, which
  // collapses the list back to one chunk.
  const [visible, setVisible] = useState(CHUNK);

  return (
    <div className="space-y-3">
      <SkillsList
        skills={skills.slice(0, visible)}
        emptyText={t(EMPTY_KEY[source])}
        onDeleteSuccess={removeSkillFromLists}
      />

      {visible < skills.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + CHUNK)}
          className="w-full rounded-lg border border-dashed border-border py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
        >
          {t('showMore', { count: skills.length - visible })}
        </button>
      )}

      {truncated && visible >= skills.length && (
        <p className="pt-1 text-center text-xs text-muted">{t('refineSearch')}</p>
      )}
    </div>
  );
}

export default function SkillsPage() {
  const t = useTranslations('Skills');
  const [source, setSource] = useState<SkillPickerSource>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted mt-1">{t('subtitle')}</p>
        </div>
        <Link
          href="/dashboard/skills/create"
          className="inline-flex items-center px-4 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors text-sm"
        >
          {t('createSkill')}
        </Link>
      </div>

      {/* Outside the Suspense boundary: typing must never unmount the field. */}
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={t('searchPlaceholder')}
        filtersActive={source !== 'all'}
        filters={
          <FilterRow label={t('sourceLabel')}>
            {SOURCES.map((key) => (
              <FilterPill key={key} active={source === key} onClick={() => setSource(key)}>
                {t(`source_${key}`)}
              </FilterPill>
            ))}
          </FilterRow>
        }
      />

      <ErrorBoundary>
        <Suspense
          fallback={<div className="text-center py-12 text-muted">{t('loading')}</div>}
        >
          <SkillsContent
            key={`${source}:${debouncedSearch}`}
            source={source}
            search={debouncedSearch}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
