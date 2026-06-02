'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { AgentSummaryResponse, PagedResponse } from '@/types';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import DeleteAgentSkillModal from '@/components/agents/DeleteAgentSkillModal';
import AddSkillAgentModal from './AddSkillAgentModal';

interface SkillAgentsTabProps {
  skillId: string;
  skillName: string;
}

export default function SkillAgentsTab({ skillId, skillName }: SkillAgentsTabProps) {
  const t = useTranslations('SkillAgents');

  const [data, setData] = useState<PagedResponse<AgentSummaryResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 300);

  const [deletingAgent, setDeletingAgent] = useState<AgentSummaryResponse | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getSkillAgents(skillId, {
        search: debouncedSearch || undefined,
        page,
        size: 20,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [skillId, debouncedSearch, page]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {data ? t('total', { count: data.totalElements }) : t('loading')}
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          {t('addAgent')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
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

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {loading && !data && (
        <div className="text-center py-12 text-muted text-sm">{t('loading')}</div>
      )}

      {data && data.empty && !loading && (
        <div className="bg-surface-secondary rounded-lg border border-border/50 p-8 text-center text-sm text-muted">
          {debouncedSearch ? t('emptySearch') : t('empty')}
        </div>
      )}

      {data && data.content.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">
                    {t('name')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">
                    {t('description')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">
                    {t('status')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors"
                  >
                    <td className="py-3 px-4 text-sm">
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className="font-medium text-foreground hover:text-accent transition-colors"
                      >
                        {agent.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted max-w-md">
                      <span className="line-clamp-2">
                        {agent.description || <span className="text-muted/60">—</span>}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${
                          agent.enabled
                            ? 'bg-success/10 text-success'
                            : 'bg-muted/10 text-muted'
                        }`}
                      >
                        {agent.enabled ? t('enabled') : t('disabled')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeletingAgent(agent)}
                        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                        title={t('removeSkill')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted">
                {t('page', { current: page + 1, total: data.totalPages })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0 || loading}
                >
                  {t('previous')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages - 1 || loading}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {deletingAgent && (
        <DeleteAgentSkillModal
          agentId={deletingAgent.id}
          skillId={skillId}
          skillName={skillName}
          onClose={() => setDeletingAgent(null)}
          onSuccess={() => {
            setDeletingAgent(null);
            fetchAgents();
          }}
        />
      )}

      {showAdd && (
        <AddSkillAgentModal
          skillId={skillId}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            fetchAgents();
          }}
        />
      )}
    </div>
  );
}
