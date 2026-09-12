'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  useSkillPickerSuspenseQuery,
  useSkillCacheActions,
  type SkillPickerFilters,
  type SkillPickerSource,
} from '@/queries/skills';
import { Link } from '@/i18n/navigation';
import SkillsList from '@/components/skills/SkillsList';
import {
  SkillCatalogToolbar,
  SkillListTail,
  useRevealedRows,
  useSkillCatalogFilters,
} from '@/components/skills/SkillCatalogToolbar';
import { Placeholder } from '@/components/ui/Placeholder';

// Rows revealed at once; "show more" grows the list in place. Both scopes are
// merged client-side, so there is no server page to walk (see the query module).
const CHUNK = 12;

const EMPTY_KEY = {
  all: 'noSkillsFound',
  my: 'noSkills',
  public: 'noPublicSkills',
} as const;

function SkillsContent({
  source,
  search,
  filters,
  listKey,
}: {
  source: SkillPickerSource;
  search: string;
  filters: SkillPickerFilters;
  listKey: string;
}) {
  const t = useTranslations('Skills');
  const { skills, truncated } = useSkillPickerSuspenseQuery(source, search, filters);
  const { removeSkillFromLists } = useSkillCacheActions();
  const { visible, revealMore } = useRevealedRows(listKey, CHUNK);
  // A section or a tag is in effect: the empty state is about the filters,
  // not about the source having nothing.
  const narrowed = !!(filters.category || filters.tag);

  return (
    <div className="space-y-3">
      <SkillsList
        skills={skills.slice(0, visible)}
        emptyText={t(narrowed ? 'noSkillsInSection' : EMPTY_KEY[source])}
        onDeleteSuccess={removeSkillFromLists}
      />
      <SkillListTail total={skills.length} visible={visible} truncated={truncated} onMore={revealMore} />
    </div>
  );
}

export default function SkillsPage() {
  const t = useTranslations('Skills');
  const catalog = useSkillCatalogFilters();

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      <SkillCatalogToolbar state={catalog} />

      <ErrorBoundary>
        <Suspense fallback={<Placeholder>{t('loading')}</Placeholder>}>
          <SkillsContent
            source={catalog.source}
            search={catalog.debouncedSearch}
            filters={catalog.filters}
            listKey={catalog.listKey}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
