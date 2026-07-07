'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Tabs } from '@/components/ui/Tabs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSkillsListQuery, useSkillsCacheActions, type SkillListTab } from '@/queries/skills';
import { Link } from '@/i18n/navigation';
import SkillsList from '@/components/skills/SkillsList';

function SkillsContent({
  tab,
  search,
  page,
  onPageChange,
}: {
  tab: SkillListTab;
  search: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations('Skills');
  const { data } = useSkillsListQuery(tab, search, page);
  const { removeSkillFromLists } = useSkillsCacheActions();

  return (
    <div className="space-y-4">
      <SkillsList
        skills={data.content}
        variant={tab}
        onDeleteSuccess={removeSkillFromLists}
      />

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted">
            {t('page', { current: page + 1, total: data.totalPages })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              {t('previous')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= data.totalPages - 1}
            >
              {t('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillsPage() {
  const t = useTranslations('Skills');
  const [activeTab, setActiveTab] = useState<SkillListTab>('my');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 300);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as SkillListTab);
    setSearch('');
    setPage(0);
  };

  const tabContent = (
    <>
      {/* Search — outside Suspense so it never unmounts */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground placeholder:text-muted text-sm"
        />
      </div>

      <ErrorBoundary>
        <Suspense fallback={
          <div className="text-center py-12 text-muted">{t('loading')}</div>
        }>
          <SkillsContent
            tab={activeTab}
            search={debouncedSearch}
            page={page}
            onPageChange={setPage}
          />
        </Suspense>
      </ErrorBoundary>
    </>
  );

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

      <Tabs
        tabs={[
          { id: 'my', label: t('mySkills'), content: tabContent },
          { id: 'public', label: t('publicSkills'), content: tabContent },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
