'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentSkillResponse, PagedResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/date';
import AddAgentSkillModal from './AddAgentSkillModal';
import DeleteAgentSkillModal from './DeleteAgentSkillModal';

interface AgentSkillsTabProps {
  agentId: string;
  // Switch the agent page to its Connections tab (CTA for a missing connector).
  onConnectConnector?: () => void;
}

export default function AgentSkillsTab({ agentId, onConnectConnector }: AgentSkillsTabProps) {
  const t = useTranslations('Agents');
  const locale = useLocale();

  const [bindings, setBindings] = useState<AgentSkillResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<Omit<PagedResponse<AgentSkillResponse>, 'content'> | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [deletingBinding, setDeletingBinding] = useState<AgentSkillResponse | null>(null);

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await apiService.getAgentSkills({ agentId, page, size: 20 });
      setBindings(data.content);
      setPageInfo({
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        size: data.size,
        number: data.number,
        first: data.first,
        last: data.last,
        empty: data.empty,
        numberOfElements: data.numberOfElements,
      });
      if (silent) setError('');
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load skills');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [agentId, page]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const handleMutationSuccess = () => {
    setShowAdd(false);
    setDeletingBinding(null);
    fetchData(false);
  };

  if (error) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingSkills')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          {pageInfo ? t('skillsTotal', { count: pageInfo.totalElements }) : ''}
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          {t('addSkill')}
        </Button>
      </div>

      {bindings.length === 0 ? (
        <div className="text-center py-12 text-muted">{t('noAgentSkills')}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('skillName')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('skillConnectors')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('addedAt')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((binding) => (
                  <tr key={binding.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        {binding.skillName ? (
                          <Link
                            href={`/dashboard/skills/${binding.skillId}`}
                            className="text-accent hover:text-accent/80 transition-colors"
                          >
                            {binding.skillName}
                          </Link>
                        ) : (
                          <span className="text-muted italic">{t('skillDeleted')}</span>
                        )}
                        {binding.needsReinstall && (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning"
                            title={t('needsReinstallHint')}
                          >
                            <ArrowPathIcon className="h-3 w-3" />
                            {t('needsReinstall')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {binding.connectors.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {binding.connectors.map((c) =>
                            c.connectionId ? (
                              <span
                                key={c.connectorCode}
                                className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success"
                              >
                                {c.connectorCode}
                              </span>
                            ) : (
                              <button
                                key={c.connectorCode}
                                type="button"
                                onClick={onConnectConnector}
                                title={t('connectConnectorHint', { code: c.connectorCode })}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                              >
                                <ExclamationTriangleIcon className="h-3 w-3" />
                                {c.connectorCode}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted">
                      {formatDate(binding.createdAt, locale)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeletingBinding(binding)}
                        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageInfo && pageInfo.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted">
                {t('policyPage')} {page + 1} / {pageInfo.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={pageInfo.first}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-secondary text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('policyPrevious')}
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={pageInfo.last}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-secondary text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('policyNext')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddAgentSkillModal
          agentId={agentId}
          boundSkillIds={new Set(bindings.map(b => b.skillId))}
          onClose={() => setShowAdd(false)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {deletingBinding && (
        <DeleteAgentSkillModal
          agentId={agentId}
          skillId={deletingBinding.skillId}
          skillName={deletingBinding.skillName}
          onClose={() => setDeletingBinding(null)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
