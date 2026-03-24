'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { SkillConnectorResponse, ConnectorCatalogEntry } from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Alert } from '@/components/ui/Alert';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import AddSkillConnectorModal from './AddSkillConnectorModal';
import DeleteSkillConnectorModal from './DeleteSkillConnectorModal';

interface SkillConnectorsTabProps {
  skillId: string;
  isOwner: boolean;
}

export default function SkillConnectorsTab({ skillId, isOwner }: SkillConnectorsTabProps) {
  const t = useTranslations('SkillConnectors');

  const [bindings, setBindings] = useState<SkillConnectorResponse[]>([]);
  const [connectors, setConnectors] = useState<ConnectorCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [deletingBinding, setDeletingBinding] = useState<SkillConnectorResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bindingsData, catalogData] = await Promise.all([
        apiService.getSkillConnectors(skillId),
        apiService.getConnectorCatalog(),
      ]);
      setBindings(bindingsData);
      setConnectors(catalogData.filter(c => c.type === 'INTEGRATION'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMutationSuccess = () => {
    setShowAdd(false);
    setDeletingBinding(null);
    fetchData();
  };

  const getConnectorName = (code: string) => {
    const c = connectors.find(c => c.code === code);
    return c?.name ?? code;
  };

  const formatType = (type: string | null): string => {
    if (!type) return '—';
    return type === 'TOOL' ? t('typeTool') : t('typeTrigger');
  };

  const getTypeBadgeClass = (type: string | null): string => {
    if (!type) return '';
    return type === 'TOOL' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning';
  };

  if (error) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          {t('total', { count: bindings.length })}
        </div>
        {isOwner && (
          <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            {t('addBinding')}
          </Button>
        )}
      </div>

      {bindings.length === 0 ? (
        <Alert variant="info">{t('universalSkillInfo')}</Alert>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('connector')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('type')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('name')}</th>
                {isOwner && (
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {bindings.map((binding) => (
                <tr key={binding.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
                  <td className="py-3 px-4 text-sm text-foreground">{getConnectorName(binding.connectorCode)}</td>
                  <td className="py-3 px-4">
                    {binding.type ? (
                      <span className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${getTypeBadgeClass(binding.type)}`}>
                        {formatType(binding.type)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground font-mono">{binding.name || <span className="text-muted">—</span>}</td>
                  {isOwner && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeletingBinding(binding)}
                        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddSkillConnectorModal
          skillId={skillId}
          connectors={connectors}
          onClose={() => setShowAdd(false)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {deletingBinding && (
        <DeleteSkillConnectorModal
          skillId={skillId}
          binding={deletingBinding}
          connectorName={getConnectorName(deletingBinding.connectorCode)}
          onClose={() => setDeletingBinding(null)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
