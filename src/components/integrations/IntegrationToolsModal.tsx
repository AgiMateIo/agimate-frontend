'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ConnectorToolSpec } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface IntegrationToolsModalProps {
  integrationId: string;
  integrationName: string;
  onClose: () => void;
}

export default function IntegrationToolsModal({
  integrationId,
  integrationName,
  onClose,
}: IntegrationToolsModalProps) {
  const t = useTranslations('IntegrationDetail');
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<ConnectorToolSpec[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getIntegrationCredentialTools(integrationId);
      setTools(res);
    } catch (err) {
      setError(getErrorMessage(err, t('toolsError')));
    } finally {
      setLoading(false);
    }
  }, [integrationId, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Modal isOpen={true} onClose={onClose} title={t('toolsTitle')} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted">{integrationName}</p>

        {loading && (
          <div className="text-center py-8 text-muted">{t('toolsLoading')}</div>
        )}

        {!loading && error && <ErrorAlert>{error}</ErrorAlert>}

        {!loading && !error && tools.length === 0 && (
          <div className="text-center py-8 text-muted">{t('toolsEmpty')}</div>
        )}

        {!loading && !error && tools.length > 0 && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className="rounded-lg border border-border bg-surface-secondary p-4"
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-foreground">
                    {tool.title || tool.name}
                  </span>
                  <span className="text-xs font-mono text-muted">{tool.name}</span>
                </div>
                {tool.description && (
                  <p className="text-sm text-muted mt-1">{tool.description}</p>
                )}
                {tool.inputSchema?.required && tool.inputSchema.required.length > 0 && (
                  <p className="text-xs text-muted mt-2">
                    {t('toolsRequired')}:{' '}
                    <span className="font-mono text-foreground">
                      {tool.inputSchema.required.join(', ')}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
