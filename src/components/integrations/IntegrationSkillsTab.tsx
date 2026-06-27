'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { SkillResponse } from '@/types';
import { PagedResponse } from '@/types/tool-use-logs';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/date';

const PAGE_SIZE = 20;

type SkillFilter = 'my' | 'public';

interface IntegrationSkillsTabProps {
  connectorCode: string;
}

export default function IntegrationSkillsTab({ connectorCode }: IntegrationSkillsTabProps) {
  const t = useTranslations('IntegrationDetail');
  const tSkills = useTranslations('Skills');
  const locale = useLocale();

  const [filter, setFilter] = useState<SkillFilter>('my');
  const [pagedData, setPagedData] = useState<PagedResponse<SkillResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { connectorCode, page, size: PAGE_SIZE };
      const data = filter === 'my'
        ? await apiService.getSkills(params)
        : await apiService.getPublicSkills(params);
      setPagedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, [connectorCode, filter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const filters: { key: SkillFilter; label: string }[] = [
    { key: 'my', label: t('mySkills') },
    { key: 'public', label: t('publicSkills') },
  ];

  const skills = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;

  const emptyMessage = filter === 'my' ? t('noSkills') : t('noPublicSkills');

  return (
    <div className="space-y-4">
      {/* Segmented control */}
      <div className="inline-flex rounded-lg bg-surface-secondary p-1 gap-1">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted">{t('loadingSkills')}</div>
      ) : error ? (
        <ErrorAlert>{error}</ErrorAlert>
      ) : skills.length === 0 ? (
        <div className="text-center py-12 text-muted">{emptyMessage}</div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <Link
              key={skill.id}
              href={`/dashboard/skills/${skill.id}`}
              className="block bg-surface-secondary rounded-lg p-4 border border-border hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {skill.isPublic && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                        {tSkills('public')}
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      {tSkills('version', { version: skill.version })}
                    </span>
                  </div>

                  <h3 className="font-medium text-foreground mt-1">{skill.name}</h3>

                  {skill.description && (
                    <p className="text-sm text-muted mt-0.5 line-clamp-2">{skill.description}</p>
                  )}

                  <div className="text-xs text-muted mt-2">
                    {tSkills('updatedAt')}: {formatDate(skill.updatedAt, locale)}
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-3 pt-2 text-xs text-muted">
              <span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} / {totalElements}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
