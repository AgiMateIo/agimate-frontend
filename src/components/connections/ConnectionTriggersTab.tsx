'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { BoltIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { TriggerSpecificationResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ConnectionDefinitionCard } from './ConnectionDefinitionCard';

interface ConnectionTriggersTabProps {
  connectionId: string;
}

export default function ConnectionTriggersTab({ connectionId }: ConnectionTriggersTabProps) {
  const t = useTranslations('ConnectionDetail');
  const [loading, setLoading] = useState(true);
  const [triggers, setTriggers] = useState<TriggerSpecificationResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getConnectionTriggers(connectionId);
      setTriggers(res);
    } catch (err) {
      setError(getErrorMessage(err, t('triggersError')));
    } finally {
      setLoading(false);
    }
  }, [connectionId, t]);

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
        <ConnectionDefinitionCard
          key={trigger.name}
          icon={BoltIcon}
          name={trigger.name}
          description={trigger.description}
          params={trigger.params.map((name) => ({ name }))}
        />
      ))}
    </div>
  );
}
