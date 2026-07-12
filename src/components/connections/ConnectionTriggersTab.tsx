'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { TriggerInfo } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface ConnectionTriggersTabProps {
  connectorCode: string;
}

export default function ConnectionTriggersTab({ connectorCode }: ConnectionTriggersTabProps) {
  const t = useTranslations('ConnectionDetail');
  const [loading, setLoading] = useState(true);
  const [triggers, setTriggers] = useState<TriggerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getConnectorTriggers(connectorCode);
      setTriggers(res);
    } catch (err) {
      setError(getErrorMessage(err, t('triggersError')));
    } finally {
      setLoading(false);
    }
  }, [connectorCode, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('triggersLoading')}</div>;
  }
  if (error) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }
  if (triggers.length === 0) {
    return <div className="text-center py-12 text-muted">{t('triggersEmpty')}</div>;
  }

  return (
    <div className="space-y-3">
      {triggers.map((trigger) => (
        <div
          key={trigger.name}
          className="rounded-lg border border-border bg-surface-secondary p-4"
        >
          <span className="font-mono text-sm text-foreground">{trigger.name}</span>
          {trigger.description && (
            <p className="text-sm text-muted mt-1">{trigger.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
