'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { useSkillAgentsQuery } from '@/queries/skills';
import { AgentSummaryResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import DeleteAgentSkillModal from '@/components/agents/DeleteAgentSkillModal';
import AddSkillAgentModal from './AddSkillAgentModal';
import { Placeholder } from '@/components/ui/Placeholder';

interface SkillAgentsTabProps {
  skillId: string;
  skillName: string;
}

export default function SkillAgentsTab({ skillId, skillName }: SkillAgentsTabProps) {
  const t = useTranslations('SkillAgents');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 300);

  const [deletingAgent, setDeletingAgent] = useState<AgentSummaryResponse | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isFetching: loading, error, refetch } = useSkillAgentsQuery(
    skillId,
    debouncedSearch,
    page,
  );

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
      <SearchToolbar
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder={t('searchPlaceholder')}
      />

      {error && <ErrorAlert>{getErrorMessage(error, 'Failed to load agents')}</ErrorAlert>}

      {loading && !data && (
        <Placeholder size="sm">{t('loading')}</Placeholder>
      )}

      {data && data.content.length === 0 && !loading && (
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
            refetch();
          }}
        />
      )}

      {showAdd && (
        <AddSkillAgentModal
          skillId={skillId}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
