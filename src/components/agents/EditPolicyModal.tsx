'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentPolicyResponse, PolicyEffect, PolicyKind, ConnectorCatalogEntry, PagedResponse } from '@/types';
import { getConnectorKind } from '@/utils/connector';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getPolicyLabels } from './policyLabels';

const CONNECTOR_PAGE_SIZE = 10;

interface EditPolicyModalProps {
  kind: PolicyKind;
  policy: AgentPolicyResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPolicyModal({ kind, policy, onClose, onSuccess }: EditPolicyModalProps) {
  const t = useTranslations('Agents');
  const labels = getPolicyLabels(kind);
  const [connectorCode, setConnectorCode] = useState(policy.connectorCode || '');
  const [connectorDisplayName, setConnectorDisplayName] = useState(policy.connectorCode || '');
  const [connectorIdentity, setConnectorIdentity] = useState(policy.connectorIdentity || '');
  const [resourceName, setResourceName] = useState(policy.resourceName || '');
  const [effect, setEffect] = useState<PolicyEffect>(policy.effect);
  const [description, setDescription] = useState(policy.description || '');

  const [connectorDropdownOpen, setConnectorDropdownOpen] = useState(false);
  const [connectorSearch, setConnectorSearch] = useState('');
  const [debouncedConnectorSearch, setDebouncedConnectorSearch] = useState('');
  const [connectorPage, setConnectorPage] = useState(0);
  const [connectorsData, setConnectorsData] = useState<PagedResponse<ConnectorCatalogEntry> | null>(null);
  const [connectorsLoading, setConnectorsLoading] = useState(false);

  // Resolve display name for pre-existing connector code on mount
  useEffect(() => {
    if (!policy.connectorCode) return;
    let cancelled = false;
    apiService.getConnectors({ search: policy.connectorCode, size: 5 })
      .then((data) => {
        if (cancelled) return;
        const match = data.content.find(c => c.code === policy.connectorCode);
        if (match) setConnectorDisplayName(match.name);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [policy.connectorCode]);

  // Debounce connector search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConnectorSearch(connectorSearch);
      setConnectorPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [connectorSearch]);

  // Fetch connectors when dropdown is open
  const fetchConnectors = useCallback(async () => {
    setConnectorsLoading(true);
    try {
      const data = await apiService.getConnectors({
        search: debouncedConnectorSearch || undefined,
        page: connectorPage,
        size: CONNECTOR_PAGE_SIZE,
      });
      setConnectorsData(data);
    } catch {
      // ignore
    } finally {
      setConnectorsLoading(false);
    }
  }, [debouncedConnectorSearch, connectorPage]);

  useEffect(() => {
    if (connectorDropdownOpen) fetchConnectors();
  }, [connectorDropdownOpen, fetchConnectors]);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to update policy',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const data = {
        connectorCode: connectorCode.trim() || null,
        connectorIdentity: connectorIdentity.trim() || null,
        resourceName: resourceName.trim() || null,
        effect,
        description: description.trim() || undefined,
      };
      if (kind === 'tool') {
        await apiService.updateAgentToolPolicy(policy.id, data);
      } else {
        await apiService.updateAgentTriggerPolicy(policy.id, data);
      }
    });

  const closeDropdown = () => {
    setConnectorDropdownOpen(false);
    setConnectorSearch('');
  };

  const connectors = connectorsData?.content ?? [];
  const connectorsTotalPages = connectorsData?.totalPages ?? 0;
  const connectorsTotalElements = connectorsData?.totalElements ?? 0;

  return (
    <Modal isOpen={true} onClose={onClose} title={t(labels.editPolicy)} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label={t('connectorCode')}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setConnectorDropdownOpen(!connectorDropdownOpen)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground text-left"
            >
              {connectorCode ? connectorDisplayName : t('anyWildcard')}
            </button>
            {connectorDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[9]" onClick={closeDropdown} />
                <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                      <input
                        type="text"
                        value={connectorSearch}
                        onChange={(e) => setConnectorSearch(e.target.value)}
                        placeholder={t('searchConnectors')}
                        className="w-full pl-8 pr-3 py-1.5 bg-surface-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-52">
                    <button
                      type="button"
                      onClick={() => { setConnectorCode(''); setConnectorDisplayName(''); closeDropdown(); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        connectorCode === '' ? 'bg-accent/5 text-accent' : 'text-foreground hover:bg-surface-secondary'
                      }`}
                    >
                      {t('anyWildcard')}
                    </button>
                    {connectorsLoading ? (
                      <div className="text-center py-4 text-muted text-sm">{t('loadingConnectors')}</div>
                    ) : connectors.length === 0 ? (
                      <div className="text-center py-4 text-muted text-sm">{t('noConnectorsFound')}</div>
                    ) : (
                      connectors.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setConnectorCode(c.code); setConnectorDisplayName(c.name); closeDropdown(); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            connectorCode === c.code ? 'bg-accent/5 text-accent' : 'text-foreground hover:bg-surface-secondary'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {c.name}
                            <span className="text-muted font-mono text-xs">{c.code}</span>
                            {(() => {
                              const ck = getConnectorKind(c);
                              return (
                                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${
                                  ck === 'APP' ? 'bg-primary/10 text-primary' :
                                  ck === 'INTEGRATION' ? 'bg-warning/10 text-warning' :
                                  'bg-surface-secondary text-muted'
                                }`}>{ck}</span>
                              );
                            })()}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  {connectorsTotalPages > 1 && (
                    <div className="flex items-center justify-end gap-3 text-xs text-muted p-2 border-t border-border">
                      <span>
                        {connectorPage * CONNECTOR_PAGE_SIZE + 1}–{Math.min((connectorPage + 1) * CONNECTOR_PAGE_SIZE, connectorsTotalElements)} / {connectorsTotalElements}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setConnectorPage((p) => p - 1)}
                          disabled={connectorPage === 0}
                          className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeftIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConnectorPage((p) => p + 1)}
                          disabled={connectorPage >= connectorsTotalPages - 1}
                          className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRightIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </FormField>

        <FormField label={t('connectorIdentity')}>
          <Input
            type="text"
            value={connectorIdentity}
            onChange={(e) => setConnectorIdentity(e.target.value)}
            placeholder={t('anyWildcard')}
          />
        </FormField>

        <FormField label={t(labels.resourceColumn)}>
          <Input
            type="text"
            value={resourceName}
            onChange={(e) => setResourceName(e.target.value)}
            placeholder={t('anyWildcard')}
          />
        </FormField>

        <FormField label={t('effect')}>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="effect"
                value="ALLOW"
                checked={effect === 'ALLOW'}
                onChange={() => setEffect('ALLOW')}
                className="accent-success"
              />
              <span className="text-sm font-medium text-success">{t('effectAllow')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="effect"
                value="DENY"
                checked={effect === 'DENY'}
                onChange={() => setEffect('DENY')}
                className="accent-error"
              />
              <span className="text-sm font-medium text-error">{t('effectDeny')}</span>
            </label>
          </div>
        </FormField>

        <details className="group">
          <summary className="text-sm font-medium text-muted cursor-pointer hover:text-foreground transition-colors">
            {t('description')}
          </summary>
          <div className="mt-2">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('description')}
              rows={3}
              maxLength={500}
            />
          </div>
        </details>

        {error && <ErrorAlert>{error}</ErrorAlert>}

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
            loading={loading}
            className="flex-1"
          >
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
