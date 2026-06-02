'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentPolicyResponse, PagedResponse, PolicyKind } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import AddPolicyModal from './AddPolicyModal';
import EditPolicyModal from './EditPolicyModal';
import DeletePolicyModal from './DeletePolicyModal';
import { getPolicyLabels } from './policyLabels';

interface AgentPoliciesTabProps {
  kind: PolicyKind;
  agentId: string;
}

export default function AgentPoliciesTab({ kind, agentId }: AgentPoliciesTabProps) {
  const t = useTranslations('Agents');
  const labels = getPolicyLabels(kind);
  const [policies, setPolicies] = useState<AgentPolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<Omit<PagedResponse<AgentPolicyResponse>, 'content'> | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AgentPolicyResponse | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<AgentPolicyResponse | null>(null);

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const fetcher = kind === 'tool'
        ? apiService.getAgentToolPolicies
        : apiService.getAgentTriggerPolicies;
      const data = await fetcher.call(apiService, { agentId, page, size: 20 });
      setPolicies(data.content);
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
        setError(err instanceof Error ? err.message : 'Failed to load policies');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [kind, agentId, page]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const handleMutationSuccess = () => {
    setShowAdd(false);
    setEditingPolicy(null);
    setDeletingPolicy(null);
    fetchData(false);
  };

  const displayValue = (value: string | null) => value || t('anyWildcard');

  if (error) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">{t(labels.loadingPolicies)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          {pageInfo ? t('policiesTotal', { count: pageInfo.totalElements }) : ''}
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          {t(labels.addPolicy)}
        </Button>
      </div>

      {policies.length === 0 ? (
        <div className="text-center py-12 text-muted">{t(labels.noPolicies)}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('connectorCode')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('connectorIdentity')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t(labels.resourceColumn)}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('effect')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
                    <td className="py-3 px-4 text-sm text-foreground">{displayValue(policy.connectorCode)}</td>
                    <td className="py-3 px-4 text-sm text-foreground font-mono">{displayValue(policy.connectorIdentity)}</td>
                    <td className="py-3 px-4 text-sm text-foreground font-mono">{displayValue(policy.resourceName)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${
                        policy.effect === 'ALLOW'
                          ? 'bg-success/10 text-success'
                          : 'bg-error/10 text-error'
                      }`}>
                        {policy.effect === 'ALLOW' ? t('effectAllow') : t('effectDeny')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingPolicy(policy)}
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingPolicy(policy)}
                          className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
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
        <AddPolicyModal
          kind={kind}
          agentId={agentId}
          onClose={() => setShowAdd(false)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {editingPolicy && (
        <EditPolicyModal
          kind={kind}
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {deletingPolicy && (
        <DeletePolicyModal
          kind={kind}
          policy={deletingPolicy}
          onClose={() => setDeletingPolicy(null)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
