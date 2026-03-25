'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { SkillResponse, PagedResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const PAGE_SIZE = 10;

interface AddAgentSkillModalProps {
  agentPubId: string;
  boundSkillIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAgentSkillModal({ agentPubId, boundSkillIds, onClose, onSuccess }: AddAgentSkillModalProps) {
  const t = useTranslations('Agents');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pagedData, setPagedData] = useState<PagedResponse<SkillResponse> | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<SkillResponse | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSkills = useCallback(async () => {
    setSkillsLoading(true);
    setSkillsError('');
    try {
      const data = await apiService.getSkills({
        search: debouncedSearch || undefined,
        page,
        size: PAGE_SIZE,
      });
      setPagedData(data);
    } catch (err) {
      setSkillsError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setSkillsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to bind skill',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (!selectedSkill) return;
      await apiService.bindAgentSkill(agentPubId, { skillPubId: selectedSkill.id });
    });

  const skills = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addSkill')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchSkills')}
            className="w-full pl-9 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {/* Skills list */}
        <div className="min-h-[280px]">
          {skillsLoading ? (
            <div className="text-center py-12 text-muted text-sm">{t('loadingSkills')}</div>
          ) : skillsError ? (
            <ErrorAlert>{skillsError}</ErrorAlert>
          ) : skills.length === 0 ? (
            <div className="text-center py-12 text-muted text-sm">{t('noSkillsFound')}</div>
          ) : (
            <div className="space-y-1">
              {skills.map((skill) => {
                const isBound = boundSkillIds.has(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => !isBound && setSelectedSkill(skill)}
                    disabled={isBound}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      isBound
                        ? 'border-transparent opacity-50 cursor-not-allowed'
                        : selectedSkill?.id === skill.id
                          ? 'border-accent bg-accent/5'
                          : 'border-transparent hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{skill.name}</span>
                      <span className="text-xs text-muted">v{skill.version}</span>
                      {skill.isPublic && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success">
                          public
                        </span>
                      )}
                      {isBound && (
                        <span className="text-xs text-muted">({t('alreadyBound')})</span>
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{skill.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-xs text-muted">
            <span>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} / {totalElements}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedSkill}
            loading={loading}
            className="flex-1"
          >
            {t('addSkill')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
