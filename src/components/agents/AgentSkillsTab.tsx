'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentSkillResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { RowAction } from '@/components/ui/RowAction';
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useAgentCacheActions, useAgentSkillsQuery } from '@/queries/agents';
import { connectionsListOptions } from '@/queries/connections';
import { connectorCatalogOptions } from '@/queries/connectors';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import AddAgentSkillModal from './AddAgentSkillModal';
import DeleteAgentSkillModal from './DeleteAgentSkillModal';
import SkillConnectionsModal from './SkillConnectionsModal';
import SkillConnectorChip, { connectorFix } from './SkillConnectorChip';

interface AgentSkillsTabProps {
  agentId: string;
  // CTA for a connector the user owns no instance of — the fix is creating a
  // connection, not picking one here.
  onCreateConnection?: (connectorCode: string) => void;
}

export default function AgentSkillsTab({ agentId, onCreateConnection }: AgentSkillsTabProps) {
  const t = useTranslations('Agents');
  const locale = useLocale();
  const { invalidateAgentAccess } = useAgentCacheActions();

  const { data: page, isPending, error: queryError } = useAgentSkillsQuery(agentId);
  const [{ data: userConnections }, { data: catalog }] = useQueries({
    queries: [connectionsListOptions(), connectorCatalogOptions()],
  });

  const [showAdd, setShowAdd] = useState(false);
  const [deletingBinding, setDeletingBinding] = useState<AgentSkillResponse | null>(null);
  const [editingBinding, setEditingBinding] = useState<AgentSkillResponse | null>(null);
  // Inline fixes are per connector of per binding, so the spinner has to be too.
  const [pendingFix, setPendingFix] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');

  const bindings = page?.content ?? [];
  const unsatisfied = bindings.filter((b) => !b.satisfied);
  const needsReinstall = bindings.some((b) => b.needsReinstall);

  const connectorName = (code: string) => catalog?.find((c) => c.code === code)?.name ?? code;
  const instanceCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of userConnections ?? []) {
      counts.set(c.connectorCode, (counts.get(c.connectorCode) ?? 0) + 1);
    }
    return counts;
  }, [userConnections]);

  // Opening a connection is the fix for most red skills, and it is a single
  // request — done from the chip rather than by sending the user elsewhere.
  const openConnector = async (
    binding: AgentSkillResponse,
    code: string,
    connectionId: string | null,
    internal: boolean,
  ) => {
    setPendingFix(`${binding.id}:${code}`);
    setActionError('');
    try {
      await apiService.bindAgentConnection(
        agentId,
        connectionId && !internal ? { connectionId } : { connectorCode: code },
      );
      invalidateAgentAccess(agentId);
    } catch (err) {
      setActionError(getErrorMessage(err, t('openConnectionFailed')));
    } finally {
      setPendingFix(null);
    }
  };

  const refreshSkills = async () => {
    setRefreshing(true);
    setActionError('');
    try {
      await apiService.refreshAgentSkills(agentId);
      invalidateAgentAccess(agentId);
    } catch (err) {
      setActionError(getErrorMessage(err, t('refreshSkillsFailed')));
    } finally {
      setRefreshing(false);
    }
  };

  const handleMutationSuccess = () => {
    setShowAdd(false);
    setDeletingBinding(null);
    setEditingBinding(null);
    invalidateAgentAccess(agentId);
  };

  if (queryError) {
    return <ErrorAlert>{getErrorMessage(queryError, 'Failed to load skills')}</ErrorAlert>;
  }

  if (isPending) {
    return <div className="text-center py-12 text-muted">{t('loadingSkills')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted">{t('skillsTotal', { count: page?.totalElements ?? 0 })}</div>
        <div className="flex items-center gap-2">
          {needsReinstall && (
            <RowAction
              icon={ArrowPathIcon}
              label={t('refreshSkills')}
              onClick={refreshSkills}
              disabled={refreshing}
              spinning={refreshing}
            />
          )}
          <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            {t('addSkill')}
          </Button>
        </div>
      </div>

      {/* The gate is live: an unsatisfied skill is not handed to the agent, so
          this is the headline of the section, not a footnote in a row. */}
      {unsatisfied.length > 0 && (
        <Alert variant="warning">
          {t('skillsUnsatisfiedSummary', { count: unsatisfied.length, total: bindings.length })}
        </Alert>
      )}

      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}

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
                {bindings.map((binding) => {
                  const editable = binding.connectors.some((c) => !c.internal);
                  return (
                    <tr
                      key={binding.id}
                      className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors"
                    >
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
                          {!binding.satisfied && (
                            <span title={t('skillNotWorkingHint')}>
                              <Chip tone="error" icon={ExclamationTriangleIcon}>
                                {t('skillNotWorking')}
                              </Chip>
                            </span>
                          )}
                          {binding.needsReinstall && (
                            <span title={t('needsReinstallHint')}>
                              <Chip tone="warning" icon={ArrowPathIcon}>
                                {t('needsReinstall')}
                              </Chip>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {binding.connectors.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {binding.connectors.map((c) => {
                              const fix = connectorFix(
                                c,
                                (instanceCount.get(c.connectorCode) ?? 0) > 0,
                              );
                              return (
                                <SkillConnectorChip
                                  key={c.connectorCode}
                                  connector={c}
                                  connectorName={connectorName(c.connectorCode)}
                                  fix={fix}
                                  pending={pendingFix === `${binding.id}:${c.connectorCode}`}
                                  onClick={
                                    fix === 'open'
                                      ? () => openConnector(binding, c.connectorCode, c.connectionId, c.internal)
                                      : fix === 'choose'
                                        ? () => setEditingBinding(binding)
                                        : fix === 'connect'
                                          ? () => onCreateConnection?.(c.connectorCode)
                                          : undefined
                                  }
                                />
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted">
                        {formatDate(binding.createdAt, locale)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {editable && (
                            <button
                              onClick={() => setEditingBinding(binding)}
                              title={t('skillConnectionsTitle')}
                              className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingBinding(binding)}
                            title={t('removeSkill')}
                            className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* One page holds every realistic agent; say so rather than paging. */}
          {page && page.totalElements > bindings.length && (
            <p className="text-xs text-muted">
              {t('skillsTruncated', { shown: bindings.length, total: page.totalElements })}
            </p>
          )}
        </>
      )}

      {showAdd && (
        <AddAgentSkillModal
          agentId={agentId}
          boundSkillIds={new Set(bindings.map((b) => b.skillId))}
          onClose={() => setShowAdd(false)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {editingBinding && (
        <SkillConnectionsModal
          agentId={agentId}
          binding={editingBinding}
          onClose={() => setEditingBinding(null)}
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
